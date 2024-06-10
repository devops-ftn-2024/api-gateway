export const getUrl = (service: string) => {
    if (service === 'users') {
        return process.env.USERS_URL;
    }
    if (service === 'auth') {
        return process.env.AUTH_URL;
    }
    if (service === 'accommodation') {
        return process.env.ACCOMMODATION_URL;
    }
};