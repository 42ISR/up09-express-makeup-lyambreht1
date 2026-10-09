function checkRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Пользователь не авторизован' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Доступ запрещён: недостаточно прав' });
    }

    next();
  };
}

module.exports = checkRole;