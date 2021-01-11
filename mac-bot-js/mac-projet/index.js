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
  function printArray(json){
    text = "\n";
    for( i = 0; i < json.length; i++){
      text += JSON.stringify(json[i]) + "\n";
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
            |Ingredients: ${printArray(recipe.ingredients)}
            |Steps: ${printArray(recipe.steps.split(","))}
            |Vegetarian: ${recipe.is_vege ? "oui" : "non"}
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
      is_vege: false,
      is_bot: false,
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
  ctx.reply('HEIG-VD Mac project - a recipes bot 2');
});

bot.command('search', (ctx) => {
  ctx.reply('heu');
});

bot.command('recommendrecipes', (ctx) => {
  if (!ctx.from || !ctx.from.id) {
    ctx.reply('We cannot guess who you are');
  } else {
    graphDAO.recommendRecipes(ctx.from.id).then((records) => {
      if (records.length === 0) ctx.reply("You haven't liked enough recipes or ingredients to have recommendations");
      else {
        const recipesList = records.map((record) => {
          const name = record.get('r').properties.name;
          const count = record.get('count(*)').toInt();
          return `${name} (${count})`;
        }).join("\n\t");
        ctx.reply(`Based your like and dislike we recommend the following recipes:\n\t${recipesList}`);
      }
    });
  }
});


// Initialize mongo connexion
// before starting bot
documentDAO.init().then(() => {
  bot.startPolling();
});