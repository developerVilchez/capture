const moment = require('moment');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Rental } = require('../models/rental');
const { Movie } = require('../models/movie');
const Joi = require('joi');
const validate = require('../middleware/validate');


const validateReturn = (req)  => {
  const schema = {
    customerId: Joi.objectId().required(),
    movieId : Joi.objectId().required(),
  };
  return Joi.validate(req, schema);
}

/* 
  Creando middleware
1ro : Lo que varía es la función que valida en cada routeHandler, debemos tener la capacidad de pasar dinámicamente la función que valida
*/

/* const validate = (req, res, next) => {
  const { error } = validateReturn(req.body);
  if (error) return res.status(400).send(error.details[0].message)
} */

router.post('/', [auth, validate(validateReturn) ],  async (req, res) => {
  
  const rental = await Rental.lookup(req.body.customerId, req.body.movieId);
  
  if(!rental) return res.status(404).send('Rental not found');
  
  if(rental.dateReturned) return res.status(400).send('Return already processed');

  rental.return()
  await rental.save(); //lo guardamos en la bd

 await Movie.update({ _id : rental.movie._id}, { 
   $inc : { numberInStock: 1 }
 });

 
 return res.send(rental);

});


module.exports = router;