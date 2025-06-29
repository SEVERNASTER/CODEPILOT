
import cors from 'cors';
import express from 'express';
import dotenv from 'dotenv';
import supabase from './services/supabaseClient.js';
import supabaseAdmin from './services/supabaseAdmin.js';
import cookieParser from 'cookie-parser';
import getColores from './data/gradientColors.js';
import authMiddleware from './middlewares/authMiddleware.js';
import { createClient } from '@supabase/supabase-js';



dotenv.config()

const app = express()
const PORT = process.env.PORT || 3000

const allowedOrigins = ['http://localhost:5173', 'https://codepilot-ten.vercel.app'];

app.use(cors({
    origin: allowedOrigins,
    credentials: true
}));

app.use(express.json())
app.use(cookieParser());



app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

app.get('/', (req, res) => {
    res.status(200).json({ message: 'El servidor funciona!!!' })
})

const generarAlias = (nombre, apellido) => {
    const inicialNombre = nombre?.trim()?.[0]?.toUpperCase() || '';
    const inicialApellido = apellido?.trim()?.[0]?.toUpperCase() || '';
    return inicialNombre + inicialApellido;
}

app.post('/api/registrar', async (req, res) => {
    const { email, password, username, nombre, apellido } = req.body

    if (!email || !password || !username || !nombre || !apellido) {
        return res.status(400).json({
            message: 'Faltan campo obligatorios',
            tipoError: 'faltan campos'
        })
    }

    try {

        // para validar email duplicado
        const { data: existeData, error: existeError } = await supabaseAdmin.auth.admin.listUsers({
            page: 1,
            perPage: 1000,
        });

        if (existeError) throw existeError;

        const existe = existeData.users.find(user => user.email === email);

        if (existe) {
            return res.status(400).json({
                message: 'El email ya está registrado',
                tipoError: 'email repetido'
            });
        }

        // para validar el nombre de usuario duplicado

        const { data: usuarioExistente, error } = await supabaseAdmin
            .from('Usuario')
            .select('id')
            .eq('username', username)
            .maybeSingle();

        if (usuarioExistente) {
            return res.status(400).json({
                message: 'El nombre de usuario ya está en uso',
                tipoError: 'username repetido'
            });
        }


        const { data: dataSign, error: errorSign } = await supabase.auth.signUp({
            email,
            password,
        })


        if (errorSign) {
            if (errorSign.message.includes('Unable to validate email address: invalid format')) {
                return res.status(400).json({
                    message: 'Formato de correo electrónico invalido',
                    tipoError: 'email invalido'
                })
            }

            if (errorSign.message.includes('Password should be at least 6 characters.')) {
                return res.status(400).json({
                    message: 'Mínimo 6 caracteres en la contraseña',
                    type: 'supabase error'
                });
            }
            throw errorSign;
        }

        const colores = getColores()

        const { data: dataUser, error: errorUser } = await supabaseAdmin
            .from('Usuario')
            .insert([{
                id: dataSign.user.id,
                email,
                username,
                nombre,
                apellido,
                alias: generarAlias(nombre, apellido),
                color1: colores.color1,
                color2: colores.color2,
            }])
            .select()

        if (errorUser) throw errorUser;


        res.status(201).json({
            message: 'Usuario creado exitosamente',
            user: dataUser
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
})



// para el login 

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body

    if (!email || !password) {
        return res.status(400).json({ message: 'Faltan campos obligatorios' })
    }

    try {
        const { data: dataAuth, error: errorAuth } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        console.log(errorAuth);


        if (errorAuth) return res.status(401).json({ message: 'Email o contraseña incorrectos' });

        const { user, session } = dataAuth

        console.log(dataAuth);


        const { data: dataUser, error: errorUser } = await supabaseAdmin
            .from('Usuario')
            .select()
            .eq('id', dataAuth.user.id)
            .single()

        if (errorUser) throw errorUser;

        res
            .cookie('token', session.access_token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 1000 * 60 * 60 * 24 // 1 día
            })
            .cookie('refresh_token', session.refresh_token, {
                httpOnly: true,
                secure: true,
                sameSite: 'none',
                maxAge: 1000 * 60 * 60 * 24 * 7, // 7 días por ejemplo
            })
            .status(200).json({
                message: 'Login existoso',
                mensajeBienvenida: `Bienvenido ${dataUser.nombre}`,
                user: dataUser,
            })


    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }
})

// para obtener un usario isando su token

app.get('/api/user', async (req, res) => {
    const token = req.cookies['token']

    if (!token) return res.status(401).json({ message: 'No autenticado' })

    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) return res.status(401).json({ message: 'Token inválido' })

    const { data: usuario, error: errorUsuario } = await supabase
        .from('Usuario')
        .select('nombre, apellido, alias, color1, color2')
        .eq('id', user.id)
        .single()

    if (errorUsuario || !usuario) {
        return res.status(404).json({ message: 'Usuario no encontrado' })
    }

    res.status(200).json({ user: usuario })
})

// para guardar mapas

app.post('/api/guardarMapa', authMiddleware, async (req, res) => {
    const { titulo, mapaData: mapa_data } = req.body

    if (!titulo || !mapa_data) return res.status(400).json({ message: 'Faltan campos obligatorios' });

    try {

        const supabaseAutenticado = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${req.token}`,
                    },
                },
            }
        );

        const { data, error } = await supabaseAutenticado
            .from('Niveles')
            .insert([{
                titulo,
                mapa_data,
                id_usuario: req.user.id
            }])

        if (error) {
            throw error
        }

        res.status(201).json({
            message: 'Nivel creado exitosamente',
            mapa: data
        })

    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message })
    }

})

// para obtener Niveles

app.get('/api/getNiveles', authMiddleware, async (req, res) => {
    try {
        const supabaseAutenticado = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${req.token}`,
                    },
                },
            }
        );

        const { data, error } = await supabaseAutenticado
            .from('Niveles')
            .select('id, titulo, mapa_data')
            .eq('id_usuario', req.user.id);

        if (error) {
            throw error;
        }

        res.status(200).json({
            message: 'Niveles obtenidos exitosamente',
            niveles: data
        });

    } catch (error) {
        console.log(error);

        console.error(error);
        res.status(500).json({ message: error.message });
    }
});

app.delete('/api/eliminarNivel/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const supabaseAutenticado = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_KEY,
            {
                global: {
                    headers: {
                        Authorization: `Bearer ${req.token}`,
                    },
                },
            }
        );

        const { error } = await supabaseAutenticado
            .from('Niveles')
            .delete()
            .eq('id', id);

        if (error) throw error;

        res.status(200).json({ message: 'Nivel eliminado correctamente' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message });
    }
});



