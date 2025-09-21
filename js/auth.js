import { supabase } from './supabaseClient.js';
import { showMessage } from './utils.js';

// Authentication functions
let currentUser = null;

// Check authentication state
export async function checkAuthState() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session && session.user) {
        currentUser = session.user;
        return true;
    } else {
        return false;
    }
}

// Get current user
export function getCurrentUser() {
    return currentUser;
}

// Handle login
export async function handleLogin(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        showMessage(error.message, true);
        return false;
    } else {
        currentUser = data.user;
        return true;
    }
}

// Handle signup
export async function handleSignup(email, password, confirmPassword) {
    if (password !== confirmPassword) {
        showMessage('Passwords do not match', true);
        return false;
    }
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (error) {
        showMessage(error.message, true);
        return false;
    } else {
        showMessage('Sign up successful! Please check your email for confirmation.', false);
        return true;
    }
}

// Handle logout
export async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        showMessage(error.message, true);
        return false;
    } else {
        currentUser = null;
        showMessage('Logged out successfully');
        return true;
    }
}