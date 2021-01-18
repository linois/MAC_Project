const { MongoClient, ObjectID  } = require('mongodb');

class DocumentDAO {

  constructor() {
    this.client = null;
    this.db = null;
    this.collection = null;
  }

  /**
   * initialise la connexion à la db et à la bonne collection
   */
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

  /**
   * insère une recette dans la db
   * 
   * @param {*} recipe : la recette
   */
  insertRecipe(recipe) {
    return this.collection.insertOne(recipe);
  }

  /**
   * récupère les recettes en fonction d'une requete
   * 
   * @param {*} search : requete
   * @param {*} isVege : faut il filtrer pour le régime vege
   * @param {*} nb : nombre de recette à retourner
   */
  getRecipes(search, isVege, nb) {
    return this.collection.find({ 'name': new RegExp(search) }).limit(nb).toArray();
  }

  /**
   * retourne une recette selon l'id donné
   * 
   * @param {*} id : id de la recette
   */
  getRecipeById(id) {
    return this.collection.findOne({ _id: new ObjectID(id) });
  }

  /*getRecipeByDuration( min = 0, max, nb) {
    return this.collection.find({duration:{$gt>min,$lt<max}}).sort({duration:1}).toArray()
  }*/

  /**
   * retourne une liste de recettes ayant un temps de préparation entre les bornes
   * 
   * @param {*} min : durée minimum
   * @param {*} max : durée maximum
   * @param {*} nb  : nombre de recette à retourner
   */
  getRecipeByDuration( min = 0, max, nb) {
    return this.collection.find().sort({duration:1}).toArray().then((result) => {
      return result.filter((it) => (it.duration >= min && ( max == null || it.duration <= max)));
    });
  }

  /**
   * retourne une liste de recettes aléatoires
   * 
   * @param {*} n 
   */
  getRandomRecipes(n) {
    return this.collection.find().limit(n).toArray();
  }

  /**
   * retourne toutes les recettes
   */
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
