const mongoose = require('mongoose');

// ===== ASYNC HANDLER =====
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// ===== ERROR TYPES HANDLER =====
const handleCastErrorDB = (err) => {
  const message = `Recurso no encontrado con ID: ${err.value}`;
  return {
    statusCode: 404,
    message,
    errorCode: 'RESOURCE_NOT_FOUND'
  };
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `El ${field} '${value}' ya está en uso. Por favor usa otro valor.`;
  
  return {
    statusCode: 400,
    message,
    errorCode: 'DUPLICATE_FIELD'
  };
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(val => val.message);
  const message = `Datos inválidos: ${errors.join('. ')}`;
  
  return {
    statusCode: 400,
    message,
    errorCode: 'VALIDATION_ERROR'
  };
};

const handleJWTError = () => ({
  statusCode: 401,
  message: 'Token inválido. Por favor inicia sesión nuevamente.',
  errorCode: 'INVALID_TOKEN'
});

const handleJWTExpiredError = () => ({
  statusCode: 401,
  message: 'Tu sesión ha expirado. Por favor inicia sesión nuevamente.',
  errorCode: 'TOKEN_EXPIRED'
});

// ===== SEND ERROR RESPONSE =====
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      message: err.message,
      errorCode: err.errorCode || 'INTERNAL_ERROR',
      stack: err.stack,
      details: err
    }
  });
};

const sendErrorProd = (err, res) => {
  // Errores operacionales que podemos mostrar al cliente
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        message: err.message,
        errorCode: err.errorCode
      }
    });
  } else {
    // Errores de programación - no mostrar detalles
    console.error('ERROR:', err);
    
    res.status(500).json({
      success: false,
      error: {
        message: 'Ha ocurrido un error interno del servidor',
        errorCode: 'INTERNAL_ERROR'
      }
    });
  }
};

// ===== GLOBAL ERROR HANDLER =====
const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else {
    let error = { ...err };
    error.message = err.message;

    // Mongoose bad ObjectId
    if (err.name === 'CastError') {
      error = { ...error, ...handleCastErrorDB(err), isOperational: true };
    }

    // Mongoose duplicate key
    if (err.code === 11000) {
      error = { ...error, ...handleDuplicateFieldsDB(err), isOperational: true };
    }

    // Mongoose validation error
    if (err.name === 'ValidationError') {
      error = { ...error, ...handleValidationErrorDB(err), isOperational: true };
    }

    // JWT errors
    if (err.name === 'JsonWebTokenError') {
      error = { ...error, ...handleJWTError(), isOperational: true };
    }

    if (err.name === 'TokenExpiredError') {
      error = { ...error, ...handleJWTExpiredError(), isOperational: true };
    }

    sendErrorProd(error, res);
  }
};

// ===== 404 HANDLER =====
const notFound = (req, res, next) => {
  const error = new Error(`Ruta no encontrada: ${req.originalUrl}`);
  error.statusCode = 404;
  error.errorCode = 'ROUTE_NOT_FOUND';
  error.isOperational = true;
  next(error);
};

// ===== CUSTOM ERROR CLASS =====
class AppError extends Error {
  constructor(message, statusCode, errorCode = 'GENERIC_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = {
  asyncHandler,
  globalErrorHandler,
  notFound,
  AppError
}; 