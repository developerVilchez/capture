module.exports = (validator) => {
  //aqui retorno una función de middleware
  return (req, res, next) => {
    const { error } = validator(req.body);
    if (error) return res.status(400).send(error.details[0].message)
    next();
  }
}