import { login } from "../utils/auth";
import '../styles/auth/login.css'

const email_input = document.getElementById('__email_input') as HTMLInputElement;
const password_input = document.getElementById('__password_input') as HTMLInputElement;
const login_btn = document.getElementById('__login')!;

// Errors
const e_err = document.getElementById('__email_error')!;
const p_err = document.getElementById('__password_error')!;
const l_err = document.getElementById('__login_error')!;

async function loginPageLogin() {
    login_btn.addEventListener('click', async () => {

        const email = email_input.value;
        const password = password_input.value;

        if (!email) {
            e_err.style.display = 'block';
        }

        if (!password) {
            p_err.style.display = 'block';
        }

        try {
            await login(email, password);
            window.location.href = '/OpenChat-Gen2/';
        } catch {
            l_err.style.display = 'block';
        };
    });
}

// Await login
await loginPageLogin();
