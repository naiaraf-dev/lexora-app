const authRepository = require('../repositories/auth.repository');

async function register(username, email, password) {
    try {
        const result = await authRepository.registerUser(username, email, password);
        return result;
    } catch (error) {
        throw error;
    }
}

async function login(email, password) {
    try {
        const user = await authRepository.loginUser(email, password);
        return user;
    } catch (error) {
        throw error;
    }
}

async function logout() {
    try {
        await authRepository.logoutUser();  
    } catch (error) {
        throw error;
    }
}
