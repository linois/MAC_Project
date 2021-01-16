const { MongoClient } = require('mongodb');

class DocumentDAO {

  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  init() {
    return new Promise((resolve) => {
      MongoClient.connect(`mongodb://root:toor@${process.env.DOCUMENTDB_HOST}/?authSource=admin`, (err, client) => {
        if (err !== null) throw err;
        this.client = client;
        this.db = client.db(process.env.DOCUMENTDB_NAME);
        this.collection = this.db.collection('mac2020');
        resolve(null);
      });
    });
  }

  close() {
    return this.client.close();
  }

  insertRecipe(recipe) {
    return this.collection.insertOne(recipe);
  }

  //TODO augmenter le nombre retourné
  getRecipes(search) {
    return this.collection.find({ 'name': new RegExp(search) }).limit(1).toArray();
  }

  getRecipeById(id) {
    return this.collection.findOne({ _id: id });
  }

  getRecipeByDuration( min = 0, max) {
    return this.collection.find().sort({duration:1}).toArray().then((result) => {
      return result.filter((it) => (it.duration >= min && ( max == null || it.duration <= max)));
    });
  }

  getRandomRecipes(n) {
    return this.collection.find().limit(n).toArray();
  }

  getAllRecipes() {
    return this.collection.find().toArray().then((result) => {
      return result.map((it) => ({
        ...it,
        _id: it._id.toString()
      }));
    });
  }
}

module.exports = DocumentDAO;
