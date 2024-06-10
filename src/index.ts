import express, { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { createProxyMiddleware, fixRequestBody } from 'http-proxy-middleware';
import { getUrl } from './config/constants';
import bodyParser from 'body-parser';
import cors from 'cors';
require('dotenv').config();

const app = express();

const corsOptions = {
  origin: process.env.ALLOWED_ORIGIN,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

const PORT = process.env.PORT;

interface RequestWithUser extends Request {
    user: {
        id: number;
        email: string;
    };
}

const resolveApiUrl = (req: Request) => {
    const url = req.originalUrl;
    let baseUrl;
    const defaultUrlService = url?.split('/')[1];
    baseUrl = getUrl(defaultUrlService);
    if (!baseUrl) {
        throw new Error('Service not found');
    }
    return baseUrl + req.originalUrl;
};

function conditionalValidateToken(req: Request, res: Response, next: NextFunction) {
  const openRoutesRegex = /^\/accommodation\/[a-zA-Z0-9]+$/;

  if (req.method === 'GET' && openRoutesRegex.test(req.originalUrl)) {
    next();
  } else {
    validateToken(req, res, next);
  }
}

const validateToken = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!process.env.AUTH_URL) {
    return res.status(500).json({ message: 'Auth service is not available' });
  }

  try {
    const token_validation_url = `${process.env.AUTH_URL}/auth/validate`;
    const response = await axios.post(token_validation_url, {}, {
      headers: { 'Authorization': token }
    });
    if (response.data.message === 'Valid token') {
      (req as RequestWithUser).user = response.data.user;
      next();
    } else {
      res.status(401).json({ message: 'Unauthorized' });
    }
  } catch (err) {
    res.status(401).json({ message: 'Unauthorized' });
  }
};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded());

app.use('/*', conditionalValidateToken, function(req, res, next) {
    createProxyMiddleware({
      target: resolveApiUrl(req),
      changeOrigin: true,
      on: {
        proxyReq: (proxyReq, req) => {
          const reqUser = (req as RequestWithUser).user;
          if (reqUser) {
            // Encode user object and set as header
            proxyReq.setHeader('user', JSON.stringify(reqUser));
          }
          fixRequestBody(proxyReq, req);
        }
      },
    })(req, res, next);
  });


app.get('/api/health', (req: Request, res: Response) => {
    return res.status(200).json({message: "Hello, World!"});
})


app.listen(PORT, () => {
  console.log(`API Gateway running on http://localhost:${PORT}`);
});



