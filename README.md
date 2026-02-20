# Go-Live Admin - Eloka Assistance Tool

A complete onboarding application with authentication, role-based access control, and admin dashboard.

## Features

- User authentication with signup and login
- Role-based access control (Admin, User, Viewer)
- Multi-step onboarding form with progress tracking
- Admin dashboard to view all submissions
- Clean yellow and white theme design
- Secure data storage with Supabase

## Tech Stack

- React with Vite
- Supabase for database and authentication
- React Router for navigation
- Row Level Security (RLS) for data protection

## Getting Started

The application is already set up and ready to use. Simply sign up for a new account to get started.

## User Roles and Permissions

### Admin
- Can submit onboarding forms
- Can view all submissions in the dashboard
- Full access to all features

### User (Default)
- Can submit onboarding forms
- Can view their own submissions
- Standard access

### Viewer
- Can view their own submissions
- Read-only access

## Application Flow

1. **Sign Up / Login**: Create a new account or login with existing credentials
2. **Onboarding Form**: Complete the 4-step onboarding process:
   - Step 1: Verify mobile number
   - Step 2: Verify email address
   - Step 3: Verify PAN details and optionally update organization name
   - Step 4: Final confirmation and submission
3. **Dashboard** (Admin only): View all submitted onboarding forms

## Database Schema

The application uses the following tables:

- `roles`: Stores user roles
- `permissions`: Stores available permissions
- `user_roles`: Links users to their roles
- `role_permissions`: Links roles to their permissions
- `onboarding_submissions`: Stores all form submissions

## Security

- All tables have Row Level Security enabled
- Users can only access data they have permission to see
- Passwords are securely hashed by Supabase Auth
- SQL injection protection on all inputs

## Default Setup

When a new user signs up, they are automatically assigned the "User" role with the following permissions:
- can_submit_forms
- can_view_own_submissions

To make a user an admin, update their role in the database.
