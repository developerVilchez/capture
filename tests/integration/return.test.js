const request = require('supertest');
const { Rental } = require('../../models/rental');
const { User } = require('../../models/user');
const { Movie } = require('../../models/movie');
const mongoose = require('mongoose');
const moment = require('moment');

describe('/api/returns', () => {
  let server;
  let customerId;
  let movieId;
  let rental;
  let token;
  let movie;

  beforeEach( async () => {
    server = require('../../index');
    customerId = mongoose.Types.ObjectId().toHexString();
    movieId = mongoose.Types.ObjectId().toHexString();
    token = new User().generateAuthToken();

    movie = new Movie({
      _id : movieId,
      title : 'mi movie',
      dailyRentalRate : 2,
      genre : { name : '12345'},
      numberInStock : 10
    })

    await movie.save();

    rental = new Rental({
      customer : {
        _id : customerId,
        name : 'Lourdes Vílchez',
        phone : '5674322'
      },
      movie : {
        _id : movieId,
        title : 'mi movie',
        dailyRentalRate : 2
      }
    })

    await rental.save()

  })

  afterEach(async () => {
    await server.close();
    await Rental.remove({}); //modelo
    await Movie.remove({});
  })

  const exec = () => {
   return request(server)
    .post('/api/returns')
    .set('x-auth-token', token)
    .send({ customerId, movieId })
  }

  it('should return 401 if user is not log in', async () => {
    token = '';
    const res = await exec()
    expect(res.status).toBe(401);
  });

  it('should return 400 if customer id is not provided', async () => {
    customerId = '';
    const res = await exec()
    expect(res.status).toBe(400)
  });

  it('should return 400 if  movie id is not provided', async () => {
    movieId = ''
    const res = await exec();
    expect(res.status).toBe(400);
})

 it('should return 404 if not exist rental for the customerId and movieId' , async () => {
  await Rental.remove();
  const res = await exec();
  expect(res.status).toBe(404);
});


it('should return 400 if return already process' , async () => {
  rental.dateReturned = new Date();
  await rental.save();

  const res = await exec();
  expect(res.status).toBe(400);
});

it('should return 200 if a valid request', async () => {
  const res = await exec();
  expect(res.status).toBe(200);
});

it('should set the returnDate if input is valid', async () => {
  /* Necesitamos el rental document de la base de datos y luego  
    inspeccionar la fecha de regreso
  */

  await exec(); //creo una renta

  //aqui estamos recargando la renta
  //traigo el doc de la bd
  const rentalInDB = await Rental.findById(rental._id); 

  /* para escenarios de test, el tiempo actual
   es diferente por eso debemos calcular la  diferencia entre el tiempo actual y el valor de la fecha de retorno  y tendría que ser menor a 10 segundos */
  const diff = new Date() - rentalInDB.dateReturned;  //diff en miliseconds
  
  //forma general 
  expect(rentalInDB.dateReturned).toBeDefined();

  expect(diff).toBeLessThan(10 * 1000)
});

it('should set the rentalFee if input is valid', async () => {

  /* dateout (current time by mongoose) para el test nos queremos asegurar
    que esta película ha salido al menos un día, por lo que hay que modifcar el
    documento renta antes de llamar la función exec()
  */

  rental.dateOut = moment().add(-7, 'days').toDate(); //Hace 7 días
  await rental.save(); //lo cambiamos en la base de datos

  await exec(); //ejecutamos el request

  const rentalInDB = await Rental.findById(rental._id); //obtenemos el doc de la bd
  expect(rentalInDB.rentalFee).toBeDefined();
  
  //7 dias por 2 dolares cada dia son 14 dolares
  expect(rentalInDB.rentalFee).toBe(14);
  
});

it('should increase the movie stock if input is valid', async () => {
  await exec();
  const movieInDb = await Movie.findById(movieId);
  expect(movieInDb.numberInStock).toBe(movie.numberInStock + 1);
  
});

it('should return the rental if input is valid', async () => {
  const res = await exec();
  const rentalInDb = await Rental.findById(rental._id);
  //muy general
  //expect(res.body).toMatchObject(rentalInDb);  
  
  //Repetitvo
/*   expect(res.body).toHaveProperty('dateOut');
  expect(res.body).toHaveProperty('dateReturned');
  expect(res.body).toHaveProperty('rentalFee');
  expect(res.body).toHaveProperty('customer');
  expect(res.body).toHaveProperty('movie');
 */
  expect(Object.keys(res.body)).toEqual(
    expect.arrayContaining(['dateOut', 'dateReturned', 'rentalFee', 'customer', 'movie'])
  )
});

})