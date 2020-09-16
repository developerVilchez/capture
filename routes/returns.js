const moment = require('moment');
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { Rental } = require('../models/rental');
const { Movie } = require('../models/movie');


router.post('/', auth,  async (req, res) => {

  const rental = await Rental.findOne({
    'customer._id' : req.body.customerId,
    'movie._id' : req.body.movieId
  });


  
  if(!req.body.customerId) return res.status(400).send('customer id not provided');

  if(!req.body.movieId) return res.status(400).send('bad request');

  if(!rental) return res.status(404).send('Rental not found');

  if(rental.dateReturned) return res.status(400).send('Return already processed');

 // Information Expert Principle
 // Esto tiene que ir el objeto renta 
 rental.dateReturned = new Date();
 const rentalDays = moment().diff(rental.dateOut, 'days');
 rental.rentalFee = rentalDays * rental.movie.dailyRentalRate;
 await rental.save(); //lo guardamos en la bd

 await Movie.update({ _id : rental.movie._id}, { 
   $inc : { numberInStock: 1 }
 });

 
 return res.status(200).send(rental);

});


module.exports = router;