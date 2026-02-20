import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Onboarding.css'

export default function Onboarding() {
  const { user, hasPermission, logout: signOut, getToken } = useAuth()
  const navigate = useNavigate()
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const [currentSlide, setCurrentSlide] = useState(1)
  const [slideData, setSlideData] = useState({
    mobile: '',
    email: '',
    pan: '',
    orgName: '',
    confirm: false
  })
  const [outputs, setOutputs] = useState({
    slide1: '',
    slide2: '',
    slide3: '',
    slide4: ''
  })
  const [slideCompleted, setSlideCompleted] = useState({
    slide1: false,
    slide2: false,
    slide3: false,
    slide4: false
  })
  const [showPanNameSection, setShowPanNameSection] = useState(false)
  const [panChangeDisabled, setPanChangeDisabled] = useState(false)
  const [finalSubmitted, setFinalSubmitted] = useState(false)

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  const updateProgress = (step) => {
    setCurrentSlide(step)
  }

  const markSlideComplete = (slideNum) => {
    setSlideCompleted(prev => ({ ...prev, [`slide${slideNum}`]: true }))
  }

  const handleSlide1Submit = async (e) => {
    e.preventDefault()
    const mobile = e.target.mobile.value

    try {
      const res = await axios.post(`${API_URL}/onboarding/verify-mobile`, { mobile }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      setOutputs(prev => ({ ...prev, slide1: JSON.stringify(res.data, null, 2) }))
      setSlideData(prev => ({ ...prev, mobile }))
      markSlideComplete(1)
    } catch (error) {
      setOutputs(prev => ({ ...prev, slide1: "Error: " + (error.response?.data?.message || error.message) }))
    }
  }

  const handleSlide2Submit = async (e) => {
    e.preventDefault()
    const email = e.target.email.value

    try {
      // Log step 2 completion to backend
      const res = await axios.post(`${API_URL}/onboarding/log-email`, { email, status: 'success', details: { step: 'Slide 2: Email' } }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })

      setOutputs(prev => ({ ...prev, slide2: 'Email Stored: ' + email }))
      setSlideData(prev => ({ ...prev, email }))
      markSlideComplete(2)
    } catch (error) {
      setOutputs(prev => ({ ...prev, slide2: "Error: " + error.message }))
    }
  }

  const handleSlide3Submit = async (e) => {
    e.preventDefault()
    const pan = e.target.pan.value

    try {
      const payload = {
        mobile: slideData.mobile,
        email: slideData.email,
        pan
      }

      const res = await axios.post(`${API_URL}/onboarding/verify-pan`, payload, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      setOutputs(prev => ({ ...prev, slide3: JSON.stringify(res.data, null, 3) }))
      setSlideData(prev => ({ ...prev, pan }))
      setShowPanNameSection(true)
      markSlideComplete(3)
    } catch (error) {
      setOutputs(prev => ({ ...prev, slide3: "Error: " + (error.response?.data?.message || error.message) }))
    }
  }

  const handlePanNameChange = async () => {
    try {
      const res = await axios.post(`${API_URL}/onboarding/update-org-name`, {
        pan: slideData.pan,
        changePanName: slideData.orgName,
        panPayload: {
          mobile: slideData.mobile,
          email: slideData.email,
          pan: slideData.pan
        }
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      setOutputs(prev => ({ ...prev, slide3: JSON.stringify(res.data, null, 3) }))
      setPanChangeDisabled(true)
    } catch (error) {
      setOutputs(prev => ({ ...prev, slide3: "Error: " + (error.response?.data?.message || error.message) }))
    }
  }

  const handleSlide4Submit = async (e) => {
    e.preventDefault()

    try {
      const checkPayload = {
        mobile: slideData.mobile,
        email: slideData.email,
        pan: slideData.pan,
        confirm: slideData.confirm
      }

      // Step 4a: Final confirmation (replaces n8n webhook4)
      const res = await axios.post(`${API_URL}/onboarding/final-confirm`, checkPayload, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })
      setOutputs(prev => ({ ...prev, slide4: JSON.stringify(res.data, null, 2) }))

      // Step 4b: Save submission to app DB
      await axios.post(`${API_URL}/onboarding/submit`, {
        mobile: slideData.mobile,
        email: slideData.email,
        pan: slideData.pan,
        orgName: slideData.orgName
      }, {
        headers: { Authorization: `Bearer ${getToken()}` }
      })

      markSlideComplete(4)
      setFinalSubmitted(true)
    } catch (error) {
      setOutputs(prev => ({ ...prev, slide4: "Error: " + (error.response?.data?.message || error.message) }))
    }
  }

  const handleNewOnboarding = () => {
    setCurrentSlide(1)
    setSlideData({ mobile: '', email: '', pan: '', orgName: '', confirm: false })
    setOutputs({ slide1: '', slide2: '', slide3: '', slide4: '' })
    setSlideCompleted({ slide1: false, slide2: false, slide3: false, slide4: false })
    setShowPanNameSection(false)
    setPanChangeDisabled(false)
    setFinalSubmitted(false)
  }

  if (!hasPermission('can_submit_forms')) {
    return (
      <div className="container">
        <h1 className="main-title">Access Denied</h1>
        <p className="sub-heading">You do not have permission to submit forms.</p>
        <button className="login-btn" onClick={handleLogout}>Logout</button>
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h1 className="main-title">Go-Live Admin</h1>
          <h2 className="sub-heading">Eloka Assistance Tool</h2>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="logout-btn" style={{ background: '#eef2ff', color: '#4f46e5', borderColor: '#4f46e5' }} onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="progress-bar">
        <div className={`step ${currentSlide >= 1 ? 'active' : ''} ${slideCompleted.slide1 ? 'completed' : ''}`}>1</div>
        <div className={`step ${currentSlide >= 2 ? 'active' : ''} ${slideCompleted.slide2 ? 'completed' : ''}`}>2</div>
        <div className={`step ${currentSlide >= 3 ? 'active' : ''} ${slideCompleted.slide3 ? 'completed' : ''}`}>3</div>
        <div className={`step ${currentSlide >= 4 ? 'active' : ''} ${slideCompleted.slide4 ? 'completed' : ''}`}>4</div>
      </div>

      <div className="slides-container">
        <div className={`slide ${currentSlide === 1 ? 'active' : ''} ${slideCompleted.slide1 ? 'submitted' : ''}`}>
          <h3>Enter Mobile Number</h3>
          <p className="subtitle">We'll use this to verify your identity</p>
          <form onSubmit={handleSlide1Submit}>
            <label>
              Mobile Number
              <input
                type="tel"
                name="mobile"
                pattern="[6-9][0-9]{9}"
                maxLength="10"
                minLength="10"
                required
                placeholder="Enter 10-digit mobile number"
                defaultValue={slideData.mobile}
                disabled={slideCompleted.slide1}
              />
            </label>
            <button type="submit" disabled={slideCompleted.slide1}>
              {slideCompleted.slide1 ? '✓ Verified' : 'Verify Mobile'}
            </button>
          </form>
          {outputs.slide1 && <div className="output">{outputs.slide1}</div>}
          <button
            className={`next-btn ${slideCompleted.slide1 ? 'enabled' : ''}`}
            disabled={!slideCompleted.slide1}
            onClick={() => updateProgress(2)}
          >
            Continue
          </button>
        </div>

        <div className={`slide ${currentSlide === 2 ? 'active' : ''} ${slideCompleted.slide2 ? 'submitted' : ''}`}>
          <h3>Enter Email Address</h3>
          <p className="subtitle">We'll send important updates to this address</p>
          <form onSubmit={handleSlide2Submit}>
            <label>
              Email Address
              <input
                type="email"
                name="email"
                required
                placeholder="example@email.com"
                defaultValue={slideData.email}
                disabled={slideCompleted.slide2}
              />
            </label>
            <button type="submit" disabled={slideCompleted.slide2}>
              {slideCompleted.slide2 ? '✓ Verified' : 'Verify Email'}
            </button>
          </form>
          {outputs.slide2 && <div className="output">{outputs.slide2}</div>}
          <button
            className={`next-btn ${slideCompleted.slide2 ? 'enabled' : ''}`}
            disabled={!slideCompleted.slide2}
            onClick={() => updateProgress(3)}
          >
            Continue
          </button>
        </div>

        <div className={`slide ${currentSlide === 3 ? 'active' : ''} ${slideCompleted.slide3 ? 'submitted' : ''}`}>
          <h3>Enter PAN Details</h3>
          <form onSubmit={handleSlide3Submit}>
            <label>
              PAN Number
              <input
                type="text"
                name="pan"
                pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                maxLength="10"
                minLength="10"
                style={{ textTransform: 'uppercase' }}
                required
                placeholder="ABCDE1234F"
                defaultValue={slideData.pan}
                disabled={slideCompleted.slide3}
              />
            </label>
            <button type="submit" disabled={slideCompleted.slide3}>
              {slideCompleted.slide3 ? '✓ PAN Verified' : 'Verify PAN'}
            </button>
          </form>
          {outputs.slide3 && <div className="output">{outputs.slide3}</div>}
          {showPanNameSection && (
            <div style={{ marginTop: '20px' }}>
              <label>
                Change Org Name (optional)
                <input
                  type="text"
                  placeholder="Enter new name"
                  value={slideData.orgName}
                  onChange={(e) => setSlideData(prev => ({ ...prev, orgName: e.target.value }))}
                  disabled={panChangeDisabled}
                />
              </label>
              <button
                className="submit-pan-change"
                onClick={handlePanNameChange}
                disabled={panChangeDisabled}
              >
                {panChangeDisabled ? '✓ Name Updated' : 'Update Org Name'}
              </button>
            </div>
          )}
          <button
            className={`next-btn ${slideCompleted.slide3 ? 'enabled' : ''}`}
            disabled={!slideCompleted.slide3}
            onClick={() => updateProgress(4)}
          >
            Continue
          </button>
        </div>

        <div className={`slide ${currentSlide === 4 ? 'active' : ''} ${slideCompleted.slide4 ? 'submitted' : ''}`}>
          <h3>Final Confirmation</h3>
          <form onSubmit={handleSlide4Submit}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <input
                type="checkbox"
                name="confirm"
                required
                checked={slideData.confirm}
                onChange={(e) => setSlideData(prev => ({ ...prev, confirm: e.target.checked }))}
                disabled={slideCompleted.slide4}
              />
              <label style={{ marginBottom: 0 }}>
                I hereby confirm that all the information provided regarding the Admin Onboarding is complete and accurate. I acknowledge that, upon this confirmation, the relevant documents pertaining to this agreement will be forwarded to Reena Yadav, Customer Service Representative at Eko.
              </label>
            </div>
            <button type="submit" disabled={slideCompleted.slide4} style={{ marginTop: '20px' }}>
              {slideCompleted.slide4 ? '✓ Onboarding Complete' : 'Complete Onboarding'}
            </button>
          </form>
          {outputs.slide4 && <div className="output">{outputs.slide4}</div>}
          {finalSubmitted && (
            <button className="new-onboarding-btn" onClick={handleNewOnboarding}>
              Start New Onboarding
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
