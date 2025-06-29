import supabase from '../services/supabaseClient.js';

const verificarToken = async (req, res, next) => {
    const token = req.cookies.token;
    const refreshToken = req.cookies.refresh_token;

    if (!token) {
        return res.status(401).json({ message: 'No hay token, acceso denegado' });
    }

    let { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
        if (refreshToken) {
            const {
                data: newSession,
                error: refreshError,
            } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

            if (refreshError || !newSession.session) {
                return res.status(401).json({ message: 'Sesión expirada y no se pudo renovar' });
            }

            res.cookie('token', newSession.session.access_token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 1000 * 60 * 60 * 24,
            });

            res.cookie('refresh_token', newSession.session.refresh_token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 1000 * 60 * 60 * 24 * 7,
            });

            req.user = newSession.session.user;
            req.token = newSession.session.access_token;
            return next();
        }

        return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    req.user = data.user;
    req.token = token;
    next();
};

export default verificarToken;
