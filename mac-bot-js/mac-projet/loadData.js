const dotenv = require('dotenv');
const parse = require('csv-parse');
const fs = require('fs').promises;
const cliProgress = require('cli-progress');
const { join } = require('path');

const DocumentDAO = require('./DocumentDAO');
const GraphDAO = require('./GraphDAO');

dotenv.config();

const buildUser = (id, username, isVege, isBot) => ({
  id,
  username,
  isVege,
  isBot
});

const shuffle = (array) => {

  for(let i = array.length - 1; i > 0; i--){
    const j = Math.floor(Math.random() * i);
    const temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }

  return array;
};

const parseRecipes = () => new Promise((resolve) => {
  fs.readFile(join(__dirname, '../data/recipes.csv')).then((baseRecipes) => {
    parse(baseRecipes, (err, data) => {
      resolve(data);
    });
  });
});

const users = [
  buildUser(220987852, 'ovesco', true, false),
  buildUser(136451861, 'thrudhvangr', false, false),
  buildUser(136451862, 'NukedFace',  false, false),
  buildUser(136451863, 'lauralol',  false, false),
  buildUser(136451864, 'Saumonlecitron', true, false),
];

const graphDAO = new GraphDAO();
const documentDAO = new DocumentDAO();


console.log('Starting mongo');
documentDAO.init().then(() => {

  console.log('Preparing Neo4j');
  graphDAO.prepare().then(() => {

    console.log('Writing users to neo4j');
    Promise.all(users.map((user) => graphDAO.upsertUser(user))).then(() => {

      console.log('Parsing CSV and writing recipes to mongo');
      const parseRecipesBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
      parseRecipes().then((parsedRecipes) => {
        parseRecipesBar.start(parsedRecipes.length, 0);

        Promise.all(parsedRecipes.map((it) => {
          const [
            rank,name,description,ingredients,steps,duration,vegetarian
          ] = it;
          return documentDAO.insertRecipe({
            rank,name,description,ingredients,steps,duration,vegetarian
          }).then(() => parseRecipesBar.increment());
        })).then(() => {
          parseRecipesBar.stop();

          // Load them back to get their id along
          console.log('Loading recipes back in memory');
          documentDAO.getAllRecipes().then((recipes) => {

            // Retrieve all ingredient from all recipes, split them and assign a numeric id
            console.log('Calculating ingredient');
            const ingredients = [...new Set(recipes.flatMap((it) => it.ingredients.split(',').map((it) => it.split(':')[0]).map(it => it.trim())))].map((it, i) => [i, it]);

            console.log('Handling ingredient insertion in Neo4j');
            //const ingredientBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
            //ingredientBar.start(ingredients.length, 0);

            Promise.all(ingredients.map(([id,name]) => new Promise((resolve2) => {
              graphDAO.upsertIngredient(id, name).then(() => {
                //ingredientBar.increment();
                resolve2();
              });
            }))).then(() => {
              console.log('Handling recipe insertion in Neo4j');
              const recipesBar = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
              recipesBar.start(recipes.length, 0);
 
              Promise.all(recipes.map((recipe) => new Promise((resolve1) => {
                const recipeIngredients = recipe.ingredients.split(',').map((it) => it.split(':')[0]).map(i => i.trim());
                graphDAO.upsertRecipe(recipe._id, recipe.name).then(() => {
                  // Update ingredient <-> recipe links
                  Promise.all(recipeIngredients.map((name) => {
                    const id = ingredients.find((it) => it[1] === name)[0];
                    return graphDAO.upsertRecipeUseIngredient(recipe._id, id);
                  })).then(() => {
                    recipesBar.increment();
                    resolve1();
                  });
                });
                graphDAO.upsertRecipe(recipe._id, recipe.name).then(() => {
                  // Update ingredient <-> recipe links
                  Promise.all(recipeIngredients.map((name) => {
                    const id = ingredients.find((it) => it[1] === name)[0];
                    return graphDAO.upsertRecipeUseIngredient(recipe._id, id);
                  })).then(() => {
                    recipesBar.increment();
                    resolve1();
                  });
                });
              }))).then(() => {/*
                // Add some recipes liked by users to test recommendation
                console.log('Add some recipes liked by users');
                const likePromise = [22, 9, 5, 16, 0].flatMap((quantity, index) => {
                  return shuffle(recipes).slice(0, quantity).map((recipe) => {
                    return graphDAO.upsertRecipeLiked(users[index], recipe._id, {
                      rank: Math.floor(Math.random() * 5) + 1,
                      at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000)) 
                    });
                  });
                });
                Promise.all(likePromise).then(() => {*/
                  recipesBar.stop();
                  console.log('Done, closing sockets');
                  Promise.all([
                    documentDAO.close(),
                    graphDAO.close()
                  ]).then(() => {
                    console.log('Done with importation');
                  });
                  /*
                  // Add some recipes added by users
                  console.log('Add some recipes liked by users');
                  const addedPromise = [400, 87, 0, 34, 58].flatMap((quantity, index) => {
                    return shuffle(recipes).slice(0, quantity).map((recipe) => {
                      return graphDAO.upsertAdded(users[index].id, recipe._id, {
                        at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000)) 
                      });
                    });
                  });
                  Promise.all(addedPromise).then(() => {

                    // Add some recipes liked by users
                    console.log('Add some recipes liked by users');
                    const likePromise = [280, 34, 98, 254, 0].flatMap((quantity, index) => {
                      return shuffle(recipes).slice(0, quantity).map((recipe) => {
                        return graphDAO.upsertMovieLiked(users[index], recipe._id, {
                          rank: Math.floor(Math.random() * 5) + 1,
                          at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000)) 
                        });
                      });
                    });
                    Promise.all(likePromise).then(() => {

                      // Add some actors liked by users
                      console.log('Add some actors liked by users');
                      const actorsPromise = [300, 674, 0, 45, 36].flatMap((quantity, index) => {
                        return shuffle(actors).slice(0, quantity).map(([actorId]) => {
                          return graphDAO.upsertActorLiked(users[index].id, actorId, {
                            rank: Math.floor(Math.random() * 5) + 1,
                            at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                          });
                        });
                      });
                      Promise.all(actorsPromise).then(() => {
                        // Add some ingredients liked by users
                        console.log('Add some ingredients liked by users');
                        const ingredientPromise = [22, 3, 0, 4, 7].flatMap((quantity, index) => {
                          return shuffle(ingredients).slice(0, quantity).map(([ingredientId, actor]) => {
                            return graphDAO.upsertGenreLiked(users[index].id, ingredientId, {
                              rank: Math.floor(Math.random() * 5) + 1,
                              at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                            });
                          });
                        });
                        Promise.all(ingredientPromise).then(() => {
                          // Add some recipes requested
                          console.log('Add some requested recipes');
                          const requestedPromise = [560, 12, 456, 25, 387].flatMap((quantity, index) => {
                            return shuffle(recipes).slice(0, quantity).map((recipe) => {
                              return graphDAO.upsertRequested(users[index].id, recipe._id, {
                                at: new Date(160613000 * 1000 + (Math.floor(Math.random() * 3124) * 1000))
                              });
                            });
                          });
                          Promise.all(requestedPromise).then(() => {
                            console.log('Done, closing sockets');
                            Promise.all([
                              documentDAO.close(),
                              graphDAO.close()
                            ]).then(() => {
                              console.log('Done with importation');
                            });
                          });
                        });
                      });
                    });
                  });*/
                //});
              });
            });
          });
        });
      });
    });
  });
});
