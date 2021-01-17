const dotenv = require('dotenv');
const Telegraf = require('telegraf');
const DocumentDAO = require('./DocumentDAO');
const GraphDAO = require('./GraphDAO');

dotenv.config();

const bot = new Telegraf(process.env.BOT_TOKEN);
const graphDAO = new GraphDAO();
const documentDAO = new DocumentDAO();

function stripMargin(template, ...expressions) {
  const result = template.reduce((accumulator, part, i) => {
      return accumulator + expressions[i - 1] + part;
  });
  return result.replace(/(\n|\r|\r\n)\s*\|/g, '$1');
}

/**
 * fonction qui affiche des messages cliquable
 * 
 * @param {*} recipeId : l'id de la recette
 * @param {*} currentLike : apréciation actuelle
 */
function buildLikeKeyboard(recipeId, currentLike) {
  return {
    inline_keyboard: [
      [1,2,3,4,5].map((v) => ({
        text: currentLike && currentLike.rank === v ? "★".repeat(v) : "☆".repeat(v),
        callback_data: v + '__' + recipeId, // payload that will be retrieved when button is pressed
      })),
    ],
  }
}

// User is using the inline query mode on the bot
bot.on('inline_query', (ctx) => {
  function printArray(array){
    
    text = "\n\t";
    for( i = 0; i < array.length; i++){
      text += array[i] + "\n\t";
    }
    
    return text += "\n";
  }
  const query = ctx.inlineQuery;
  if (query) {
    documentDAO.getRecipes(query.query).then((recipes) => {
      const answer = recipes.map((recipe) => ({
        id: recipe._id,
        type: 'article',
        title: recipe.name,
        description: recipe.description,
        reply_markup: buildLikeKeyboard(recipe._id),
        input_message_content: {
          message_text: stripMargin`
            |Name: ${recipe.name}
            |Description: ${recipe.description}
            |Ingredients: ${printArray(recipe.ingredients.split(","))}
            |Steps: ${printArray(recipe.steps.split(","))}
            |Vegetarian: ${recipe.isVege ? "oui" : "non"}
            |Temps de préparation: ${recipe.duration} min
          `
        },
      }));
      ctx.answerInlineQuery(answer);  
    });
  }
});

// User chose a recipe from the list displayed in the inline query
// Used to update the keyboard and show filled stars if user already liked it
bot.on('chosen_inline_result', (ctx) => {
  if (ctx.from && ctx.chosenInlineResult) {
    graphDAO.getRecipeLiked(ctx.from.id, ctx.chosenInlineResult.result_id).then((liked) => {
      if (liked !== null) {
        ctx.editMessageReplyMarkup(buildLikeKeyboard(ctx.chosenInlineResult.result_id, liked));
      }  
    });
  }
});

bot.on('callback_query', (ctx) => {
  if (ctx.callbackQuery && ctx.from) {
    const [rank, recipeId] = ctx.callbackQuery.data.split('__');
    const liked = {
      rank: parseInt(rank, 10),
      at: new Date()
    };

    graphDAO.upsertRecipeLiked({
      isVege: false,
      isBot: false,
      username: 'unknown',
      ...ctx.from,
    }, recipeId, liked).then(() => {
      ctx.editMessageReplyMarkup(buildLikeKeyboard(recipeId, liked));
    }); 
  }
});


bot.command('help', (ctx) => {
  ctx.reply(`
A recipe bot for the MAC project at the HEIG-VD.

A user can display a recipe...

Use inline queries to ...
  `);
});

bot.command('start', (ctx) => {
  ctx.reply('HEIG-VD Mac project - a recipe bot');
});

bot.command('searchByIngredient', (ctx) => {
  const ingredients = ctx.message.text.substr(20).split(',');
  for (ingredientName of ingredients) {
    graphDAO.getRecipesByIngredient(ingredientName).then( (recipeIds) => {
      for (const recipeId of recipeIds) {
        documentDAO.getRecipeById(recipeId).then( (recipe) => {
          if (recipe == null) {
            ctx.reply("cet ingredient n'est utilisé dans aucune de nos recettes"); 
          } else {
            const answer = stripMargin`
                  |Name: ${recipe.name}
                  |Description: ${recipe.description}
                  |Vegetarian: ${recipe.isVege ? "oui" : "non"}
                `;
            ctx.reply(answer); 
          }
        })
      }
    }); 
  }
});

function searchRecipeByDuration(ctx, min,max) {
  documentDAO.getRecipeByDuration(min,max).then( (recipes) => {
    if (recipes.length === 0) {
      ctx.reply("aucune de nos recettes est dans cette catégorie de temps"); 
    } else {
      for (const recipe of recipes) {
        const answer = stripMargin`
              |Name: ${recipe.name}
              |Description: ${recipe.description}
              |Vegetarian: ${recipe.isVege ? "oui" : "non"}
            `;
        ctx.reply(answer); 
      }
    }
  })
}

bot.command('searchRecipeShort', (ctx) => {
  searchRecipeByDuration(ctx,0,20);
});

bot.command('searchRecipeMedium', (ctx) => {
  searchRecipeByDuration(ctx,21,60);
});

bot.command('searchRecipeLong', (ctx) => {
  searchRecipeByDuration(ctx,61,null);
});

bot.command('searchFamousRecipe', (ctx) => {
  //todo augmenter le top
  graphDAO.getTopFamousRecipes(1).then( (records) => {
    for (const record of records) {
      documentDAO.getRecipeById(record['recipeId']).then( (recipe) => {
        if (recipe == null) {
          ctx.reply('aucune recette noté'); 
        } else {
          const answer = stripMargin`
                |Name: ${recipe.name}
                |Description: ${recipe.description}
                |Moyenne: ${record.avg}/5 ★
                |Votes: ${record.nbVote}
                |Vegetarian: ${recipe.isVege ? "oui" : "non"}
              `;
          ctx.reply(answer); 
        }
      })
    }
  });
});

bot.command('searchLikedRecipe', (ctx) => {
  graphDAO.getTopRecipeLiked( ctx.from.id, 1).then( (records) => {
    for (record of records) {
      documentDAO.getRecipeById(record['recipeId']).then( (recipe) => {
        if (recipe == null) {
          ctx.reply("vous n'avez aimé aucune recette");
        } else {
          const answer = stripMargin`
                |Name: ${recipe.name}
                |Description: ${recipe.description}
                |Rank: ${record.rank}/5 ★
                |Vegetarian: ${recipe.isVege ? "oui" : "non"}
              `;
          ctx.reply(answer); 
        }
      })
    }
  }); 
});

bot.command('toggleVegan', (ctx) => {
  if (!ctx.from || !ctx.from.id) {
    ctx.reply('We cannot guess who you are');
  } else {
    ctx.from.isVege = !ctx.from.isVege;
    graphDAO.getUser(ctx.from.id).then( user => {
      user.isVege = !user.isVege;
      graphDAO.upsertUser(user);
      ctx.reply(`l'option végétarien a été ${user.isVege ? '' : 'dés'}activé !`);
    })
  }
});

bot.command('recommendrecipes', (ctx) => {
  if (!ctx.from || !ctx.from.id) {
    ctx.reply('We cannot guess who you are');
  } else {
    //augmenter nombre
    graphDAO.recommendRecipes(ctx.from.id, 1).then((records) => {/*
      if (records.length === 0) {
        ctx.reply("You haven't liked enough recipes or ingredients to have recommendations");
      } else {
        const recipesList = records.map((record) => {
          const name = record.get('r').properties.name;
          const count = record.get('count(*)').toInt();//nb ingredient commun avec recipe liked
          //célébrité
          return `${name} (${count})`;
        }).join("\n\t");
        ctx.reply(`Based your like and dislike we recommend the following recipes:\n\t${recipesList}`);
      }*/
    });
  }
});

// Initialize mongo connexion
// before starting bot
documentDAO.init().then(() => {
  bot.startPolling();
});