/**
 * Auth Module
 * Handles user authentication
 */

import { fetchAPI } from './api.js';
import { state, setState } from './state.js';
import { initApp } from './init.js';
import { showLoading, hideLoading } from './loading.js';

// DOM Elements
const appContainer = document.getElementById('app');
const authContainer = document.getElementById('auth-container');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const showRegisterLink = document.getElementById('show-register');
const showLoginLink = document.getElementById('show-login');
const loginBtn = document.getElementById('login-btn');
const registerBtn = document.getElementById('register-btn');
const logoutBtn = document.getElementById('logout-btn');
const loginUsernameInput = document.getElementById('login-username');
const loginPasswordInput = document.getElementById('login-password');
const registerUsernameInput = document.getElementById('register-username');
const registerPasswordInput = document.getElementById('register-password');

export async function handleAuth(url, body, isRegister = false) {
    try {
        showLoading();
        
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            setState({ user: data.user });
            await checkAuth();
            if (isRegister) {
                alert('Registration successful! You are now logged in.');
            }
        } else {
            hideLoading();
            alert(data.msg);
        }
    } catch (error) {
        hideLoading();
        alert('An error occurred. Please try again.');
    }
}

export async function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        await initApp();
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

export function logout() {
    localStorage.removeItem('token');
    setState({ profiles: [], selectedProfileId: null, user: null });
    checkAuth();
}

export function initAuthListeners() {
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
    });

    logoutBtn.addEventListener('click', logout);

    registerBtn.addEventListener('click', () => {
        const login = registerUsernameInput.value;
        const password = registerPasswordInput.value;
        if (login && password) {
            handleAuth('/api/auth/register', { login, password }, true);
        }
    });

    loginBtn.addEventListener('click', () => {
        const login = loginUsernameInput.value;
        const password = loginPasswordInput.value;
        if (login && password) {
            handleAuth('/api/auth/login', { login, password });
        }
    });
}