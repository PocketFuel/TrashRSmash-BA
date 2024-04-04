import jwt from 'jsonwebtoken';

const authMiddleware = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.header('x-auth-token');
    const secret = "testSecretString";

    // Check if not token
    if (!token) {
      return res.status(401).json({ msg: 'No token, authorization denied' });
    }

    // Verify token
    try {
      const decoded = await jwt.verify(token, secret);
  
      req.user = decoded.user;
      next();
    } catch (error) {
      res.status(500).json({'Token is not valid': error})
    }
  } catch (err) {
    console.error('something wrong with auth middleware', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

export default authMiddleware;
