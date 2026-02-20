import { sbReadPool, sbWritePool } from '../lib/simplibankDb.js';

/**
 * Onboarding Processing Service
 * 
 * Replaces the 4 n8n webhook workflows with direct DB operations.
 * All functions are pure business logic (no Express req/res).
 */

// ─── Webhook1: Mobile Verification ───────────────────────────────────────────
// Looks up customerid from ekocsp by cellnumber
export async function verifyMobile(mobile) {
    const [rows] = await sbReadPool.query(
        'SELECT customerid FROM ekocsp WHERE cellnumber = ?',
        [mobile]
    );

    if (rows.length === 0) {
        return { found: false, customerid: null };
    }

    return { found: true, customerid: rows[0].customerid };
}

// ─── Webhook2: PAN Verification & Assignment ─────────────────────────────────
// 1. Nullify existing PAN in all 3 tables
// 2. Get customerid by mobile
// 3. Assign PAN to the customer in all 3 tables
export async function verifyAndAssignPan(mobile, email, pan) {
    const results = {
        nullified: { user_profile: false, ekocsp: false, customer_detail: false },
        assigned: { user_profile: false, ekocsp: false, customer_detail: false },
        customerid: null,
    };

    // Step 1: Nullify existing PAN across all 3 tables (parallel)
    const nullifyPromises = [
        sbWritePool.query(
            'UPDATE user_profile SET pan_number = NULL WHERE pan_number = ?',
            [pan]
        ).then(([r]) => { results.nullified.user_profile = r.affectedRows > 0; })
            .catch(err => { console.error('Nullify PAN user_profile error:', err.message); }),

        sbWritePool.query(
            'UPDATE ekocsp SET pancardnumber = NULL WHERE pancardnumber = ?',
            [pan]
        ).then(([r]) => { results.nullified.ekocsp = r.affectedRows > 0; })
            .catch(err => { console.error('Nullify PAN ekocsp error:', err.message); }),

        sbWritePool.query(
            'UPDATE customer_detail SET IDProofNum = NULL WHERE IDProofNum = ?',
            [pan]
        ).then(([r]) => { results.nullified.customer_detail = r.affectedRows > 0; })
            .catch(err => { console.error('Nullify PAN customer_detail error:', err.message); }),
    ];

    await Promise.allSettled(nullifyPromises);

    // Step 2: Get CustomerID by mobile
    const [custRows] = await sbReadPool.query(
        'SELECT customerid FROM ekocsp WHERE cellnumber = ?',
        [mobile]
    );

    if (custRows.length === 0) {
        return { ...results, error: 'Customer not found for this mobile number' };
    }

    const customerid = custRows[0].customerid;
    results.customerid = customerid;

    // Step 3: Assign PAN to customer in all 3 tables (parallel)
    const assignPromises = [
        sbWritePool.query(
            "UPDATE user_profile SET pan_number = ? WHERE customer_id = ?",
            [pan, customerid]
        ).then(([r]) => { results.assigned.user_profile = r.affectedRows > 0; })
            .catch(err => { console.error('Assign PAN user_profile error:', err.message); }),

        sbWritePool.query(
            "UPDATE ekocsp SET pancardnumber = ? WHERE customerid = ?",
            [pan, customerid]
        ).then(([r]) => { results.assigned.ekocsp = r.affectedRows > 0; })
            .catch(err => { console.error('Assign PAN ekocsp error:', err.message); }),

        sbWritePool.query(
            "UPDATE customer_detail SET IDProofNum = ? WHERE customer_id = ?",
            [pan, customerid]
        ).then(([r]) => { results.assigned.customer_detail = r.affectedRows > 0; })
            .catch(err => { console.error('Assign PAN customer_detail error:', err.message); }),
    ];

    await Promise.allSettled(assignPromises);

    return results;
}

// ─── Webhook3: Update Org Name ───────────────────────────────────────────────
// 1. Get org id (bcid) from ekocsp
// 2. Update message suffix in ekobcdetail
// 3. Get customerid
// 4. Check account activation
// 5. Update org name (bcname) in ekobcdetail
export async function updateOrgName(pan, changePanName, mobile, email) {
    const results = {
        bcid: null,
        messageSuffixUpdated: false,
        customerid: null,
        accountActivated: false,
        orgNameUpdated: false,
    };

    // Step 1: Get org id
    const [orgRows] = await sbReadPool.query(
        'SELECT bcid FROM ekocsp WHERE cellnumber = ? AND is_org_admin = 1',
        [mobile]
    );

    if (orgRows.length === 0) {
        return { ...results, error: 'Org admin not found for this mobile number' };
    }

    const bcid = orgRows[0].bcid;
    results.bcid = bcid;

    // Step 2: Update message suffix
    const [suffixResult] = await sbWritePool.query(
        `UPDATE ekobcdetail
     SET messagesuffix = 'Eko India',
         sms_sender_id = 1,
         business_email = ?
     WHERE bcid = ?`,
        [email, bcid]
    );
    results.messageSuffixUpdated = suffixResult.affectedRows > 0;

    // Step 3: Get customerid
    const [custRows] = await sbReadPool.query(
        'SELECT customerid FROM ekocsp WHERE cellnumber = ?',
        [mobile]
    );

    if (custRows.length > 0) {
        const customerid = custRows[0].customerid;
        results.customerid = customerid;

        // Step 4: Check account activation
        const [acctRows] = await sbWritePool.query(
            'SELECT CREATED_DATE FROM account WHERE customer_id = ? AND version_no > 1',
            [customerid]
        );
        results.accountActivated = acctRows.length > 0;
    }

    // Step 5: Update org name
    if (changePanName) {
        const [nameResult] = await sbWritePool.query(
            'UPDATE ekobcdetail SET bcname = ? WHERE bcid = ?',
            [changePanName, bcid]
        );
        results.orgNameUpdated = nameResult.affectedRows > 0;
    }

    return results;
}

// ─── Webhook4: Final Confirmation ────────────────────────────────────────────
// 1. Get cspcode from ekocsp
// 2. Get admin info (bcid, displayname, cellnumber)
// 3. (Optional) Find agreement files via SSH + send email
// Note: SSH/email functionality requires ssh2 + nodemailer packages + credentials
export async function finalConfirmation(mobile, email, pan, confirm) {
    const results = {
        cspcode: null,
        adminInfo: null,
        emailSent: false,
        message: '',
    };

    // Step 1: Get CSP code
    const [cspRows] = await sbReadPool.query(
        'SELECT cspcode FROM ekocsp WHERE cellnumber = ?',
        [mobile]
    );

    if (cspRows.length > 0) {
        results.cspcode = cspRows[0].cspcode;
    }

    // Step 2: Get Admin info
    const [adminRows] = await sbReadPool.query(
        'SELECT bcid, displayname, cellnumber FROM ekocsp WHERE cellnumber = ?',
        [mobile]
    );

    if (adminRows.length > 0) {
        results.adminInfo = adminRows[0];
    }

    // Step 3: SSH + Email (only if credentials are configured)
    const hasEmailConfig = (process.env.SSH_HOST) && (process.env.SMTP_USER || process.env.GMAIL_CLIENT_ID);

    if (hasEmailConfig) {
        try {
            await sendAgreementEmail(results.cspcode, results.adminInfo);
            results.emailSent = true;
            results.message = 'Onboarding completed and agreement email sent.';
        } catch (err) {
            console.error('Email send error:', err.message);
            results.message = 'Onboarding completed but email send failed.';
        }
    } else {
        results.message = 'Onboarding completed. Email/SSH not configured — skipping agreement email.';
        console.warn('⚠️  SSH_HOST or Email config not found, skipping agreement email.');
    }

    return results;
}

// ─── Email Helper (Webhook4 sub-task) ────────────────────────────────────────
async function sendAgreementEmail(cspcode, adminInfo) {
    // Dynamic imports so the app doesn't fail if these packages aren't installed
    let Client, nodemailer;
    try {
        const ssh2Module = await import('ssh2');
        Client = ssh2Module.Client;
        nodemailer = (await import('nodemailer')).default;
    } catch {
        throw new Error('ssh2 or nodemailer packages not installed. Run: npm install ssh2 nodemailer');
    }

    if (!cspcode || !adminInfo) {
        throw new Error('Missing cspcode or admin info for email');
    }

    // SSH: Find and download agreement files
    const files = await findAgreementFilesSSH(Client, cspcode);

    // Build email body
    const emailBody = `Hello Team,

Please find attached the agreement for the new admin.

**Admin Name:** ${adminInfo.displayname || 'Unknown Admin'}
**Org ID:** ${adminInfo.bcid || 'Unknown Org ID'}
**Cell Number:** ${adminInfo.cellnumber || 'Unknown Cell Number'}

Best regards,
Team Devops`;

    // Send email
    try {
        const { sendEmail } = await import('./emailService.js');
        await sendEmail({
            to: process.env.AGREEMENT_EMAIL_TO || 'shrey.vats@eko.co.in',
            subject: `New Admin onboarding details and Agreement code: ${cspcode}`,
            text: emailBody,
            attachments: files.map(f => ({
                filename: f.name,
                content: f.data,
            })),
        });
    } catch (err) {
        // Fallback or rethrow depending on needs, maintaining existing behavior of throwing
        throw err;
    }
}

// SSH: find agreement files on remote server
async function findAgreementFilesSSH(Client, cspcode) {
    return new Promise((resolve, reject) => {
        const conn = new Client();

        conn.on('ready', () => {
            // Find files matching cspcode
            conn.exec(`find /data/eko/files/agreements -type f -name "${cspcode}"`, (err, stream) => {
                if (err) { conn.end(); return reject(err); }

                let stdout = '';
                stream.on('data', (data) => { stdout += data.toString(); });
                stream.stderr.on('data', (data) => { console.error('SSH stderr:', data.toString()); });

                stream.on('close', async () => {
                    const filePaths = stdout.split('\n').map(f => f.trim()).filter(f => f !== '');

                    if (filePaths.length === 0) {
                        conn.end();
                        return resolve([]);
                    }

                    // Download each file via SFTP
                    try {
                        const files = await downloadFilesSSH(conn, filePaths);
                        conn.end();
                        resolve(files);
                    } catch (downloadErr) {
                        conn.end();
                        reject(downloadErr);
                    }
                });
            });
        });

        conn.on('error', reject);

        conn.connect({
            host: process.env.SSH_HOST,
            port: parseInt(process.env.SSH_PORT || '22'),
            username: process.env.SSH_USER,
            password: process.env.SSH_PASSWORD,
        });
    });
}

// Download files from remote server via SFTP
function downloadFilesSSH(conn, filePaths) {
    return new Promise((resolve, reject) => {
        conn.sftp((err, sftp) => {
            if (err) return reject(err);

            const downloads = filePaths.map(filePath => {
                return new Promise((res, rej) => {
                    const chunks = [];
                    const readStream = sftp.createReadStream(filePath);
                    readStream.on('data', chunk => chunks.push(chunk));
                    readStream.on('end', () => {
                        res({
                            name: filePath.split('/').pop(),
                            data: Buffer.concat(chunks),
                        });
                    });
                    readStream.on('error', rej);
                });
            });

            Promise.all(downloads).then(resolve).catch(reject);
        });
    });
}
