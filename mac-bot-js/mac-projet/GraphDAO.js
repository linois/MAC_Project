
const neo4j = require('neo4j-driver');

class GraphDAO {
  
  constructor() {
    this.driver = neo4j.driver(`bolt://${process.env.GRAPHDB_HOST}`, neo4j.auth.basic('neo4j', process.env.GRAPHDB_PASSWORD));
  }

  prepare() {
    return new Promise((resolve) => {
      this.run("CREATE CONSTRAINT ON (n:Recipe) ASSERT n.id IS UNIQUE", {}).then(() => {
        this.run("CREATE CONSTRAINT ON (u:User) ASSERT u.id IS UNIQUE", {}).then(() => resolve());
      });
    });
  }

  close() {
    return this.driver.close();
  }

  /**
   * ajoute ou modifie une relation LIKED et le noeud USER impliqué
   * 
   * @param {*} user : contient les attributs de l'utilisateur
   * @param {*} recipeId : id de la recette
   * @param {*} liked : contient les attributs de la relation
   */
  upsertRecipeLiked(user, recipeId, liked) {
    return this.run(`
      MATCH (m:Recipe {id: $recipeId})
        MERGE (u:User {id: $userId})
          ON CREATE SET u.isBot = $isBot,
                        u.username = $username,
                        u.isVege = $isVege
          ON MATCH SET  u.isBot = $isBot,
                        u.username = $username,
                        u.isVege = $isVege
        MERGE (u)-[l:LIKED]->(m)
          ON CREATE SET l.rank = $likedRank,
                        l.at = $likedAt
          ON MATCH SET  l.rank = $likedRank,
                        l.at = $likedAt
    `, {
      recipeId,
      isBot: user.isBot,
      username: user.username,
      isVege: user.isVege,
      userId: this.toInt(user.id),
      likedRank: liked.rank,
      likedAt: this.toDate(liked.at),
    });
  }

  /**
   * retourne une liste des recettes que l'utilsateur a le plus aimé
   * 
   * @param {*} userId : id de l'utilisateur
   * @param {*} nb : nombre de recette à retourner
   */
  getTopRecipeLiked(userId, nb) {
    return this.run('MATCH (:User{id: $userId})-[l:LIKED]-(r:Recipe) RETURN r,l ORDER BY l.rank DESC LIMIT $nb', {
      userId,
      nb,
    }).then((res) => {
      if (res.records.length === 0) {
        return null;
      } else {
        return res.records.map( record => {
          return {
            recipeId: record.get('r').properties.id,
            rank: record.get('l').properties.rank,
            at: record.get('l').properties.at,
          };
        });
      }
    });
  }

  /**
   * retourne les attributs d'une relation LIKED entre un utilisateur et une recette
   * 
   * @param {*} userId   : id de l'utilisateur
   * @param {*} recipeId : id de la recette
   */
  getRecipeLiked(userId, recipeId) {
    return this.run('MATCH (:User{id: $userId})-[l:LIKED]-(:Recipe{id: $recipeId}) RETURN l', {
      userId,
      recipeId,
    }).then((res) => {
      if (res.records.length === 0) return null;
      else {
        const record = res.records[0].get('l');
        return {
          rank: record.properties.rank,
          at: record.properties.at,
        }
      }
    });
  }

  /**
   * fonction qui retourne une liste des recettes les plus aimés
   * 
   * @param {*} topSize : nombre de recette à retourner
   */
  getTopFamousRecipes(topSize) {
    return this.run('MATCH (:User)-[l:LIKED]-(r:Recipe) RETURN r, count(l.rank) AS vote, avg(l.rank) AS avg ORDER BY avg DESC LIMIT $topSize', {
      topSize,
    }).then((res) => {
      if (res.records.length === 0) return null;
      else {
        return res.records.map( record => {
          return {
            recipeId: record.get('r').properties.id,
            avg: record.get('avg'),
            nbVote: record.get('vote'),
          }
        });
      }
    });
  }

  /**
   * fonction qui retourne une liste des recettes ayant l'ingrédient indiqué
   * 
   * @param {*} ingredientName : nom de l'ingredient
   * @param {*} nb : nombre de recette à retourner
   */
  getRecipesByIngredient(ingredientName, nb) {
    return this.run('MATCH (:Ingredient{name: $ingredientName})-[:USE]-(r:Recipe) RETURN r LIMIT $nb', {
      ingredientName,
      nb
    }).then((res) => {
      if (res.records.length === 0) return null;
      else {
        return res.records.map( record => record.get('r').properties.id);
      }
    });
  }

  /**
   * fonction qui ajoute ou modifie une recette
   * 
   * @param {*} recipeId : id de la recette
   * @param {*} recipeName : nom de la recette
   */
  upsertRecipe(recipeId, recipeName) {
    return this.run('MERGE (r:Recipe{id: $recipeId}) ON CREATE SET r.name = $recipeName', {
      recipeId,
      recipeName,
    })
  }

  /**
   * fonction qui ajoute ou modifie un ingrédient
   * 
   * @param {*} ingredientId : id de l'ingrédient
   * @param {*} ingredientName : nom de l'ingrédient
   */
  upsertIngredient( ingredientId, ingredientName) {
    return this.run(`MERGE (i:Ingredient{id: $ingredientId}) ON CREATE SET i.name = $ingredientName`, {
      ingredientId,
      ingredientName
    });
  }

  /**
   * fonction qui ajoute ou modifie une relation USE
   * 
   * @param {*} recipeId : id de la recette
   * @param {*} ingredientId : contient attributs d'un ingrédient
   */
  upsertRecipeUseIngredient(recipeId, ingredientId) {
    return this.run(`
      MATCH (r:Recipe{ id: $recipeId })
      MATCH (i:Ingredient{id: $ingredientId})
      MERGE (r)-[:USE]->(i)
    `, {
      recipeId,
      ingredientId
    });
  }

  /**
   * fonction qui récupère les attributs d'un utilisateur
   * 
   * @param {*} userId : id de l'utilisateur
   */
  getUser(userId){
    return this.run(`MATCH (u:User{ id: $userId }) RETURN u`, {
      userId,
    }).then((res) => {
      if (res.records.length === 0) return null;
      else {
        return res.records[0].get('u').properties;
      }
    });
  }

  /**
   * fonction qui ajoute ou modifie un utilisateur
   * 
   * @param {*} user : contient les attributs d'un utilisateur
   */
  upsertUser(user) {
    return this.run(`
      MERGE (u:User {id: $userId})
        ON CREATE SET u.isBot = $isBot,
          u.username = $username,
          u.isVege = $isVege
        ON MATCH SET  u.isBot = $isBot,
          u.username = $username,
          u.isVege = $isVege
    `, {
      userId: this.toInt(user.id),
      username: user.username,
      isVege: user.isVege,
      isBot: user.isBot,
    });
  }

/*
  upsertAdded(userId, recipeId, added) {
    return this.run(`
      MATCH (r:Recipe{ id: $recipeId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:ADDED]->(m)
        ON CREATE SET r.at = $at
        ON MATCH SET  r.at = $at
    `, {
      userId: this.toInt(userId),
      recipeId,
      at: this.toDate(added.at),
    });
  }
*/
  /**
   * fonction qui ajoute ou modifie une relation LIKED
   * 
   * @param {*} userId : id de l'utilisateur
   * @param {*} recipeId : id de la recette
   * @param {*} liked : attributs d'une relation LIKED
   */
  upsertRecipeUserLiked(userId, recipeId, liked) {
    return this.run(`
      MATCH (m:Recipe{ id: $recipeId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:LIKED]->(m)
        ON CREATE SET r.at = $at,
                      r.rank = $rank
        ON MATCH SET  r.at = $at,
                      r.rank = $rank
    `, {
      userId: this.toInt(userId),
      recipeId,
      at: this.toDate(liked.at),
      rank: this.toInt(liked.rank)
    });
  }

/*
  upsertIngredientLiked(userId, ingredientId, liked) {
    return this.run(`
      MATCH (g:Ingredient{ id: $ingredientId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:LIKED]->(g)
      ON CREATE SET r.at = $at,
                    r.rank = $rank
      ON MATCH SET  r.at = $at,
                    r.rank = $rank
    `, {
      userId: this.toInt(userId),
      ingredientId: this.toInt(ingredientId),
      at: this.toDate(liked.at),
      rank: liked.rank
    });
  }

  upsertRequested(userId, recipeId, requested) {
    return this.run(`
      MATCH (m:Recipe{ id: $recipeId })
      MATCH (u:User{ id: $userId })
      MERGE (u)-[r:REQUESTED]->(m)
        ON CREATE SET r.at = $at
        ON MATCH SET  r.at = $at
    `, {
      userId: this.toInt(userId),
      recipeId,
      at: this.toDate(requested.at),
    });
  }

  upsertCommentAboutRecipe(userId, recipeId, comment) {
    return this.run(`
      MATCH (m:Recipe{ id: $recipeId })
      MATCH (u:User{ id: $userId })
      MERGE (c:Comment{ id: $commentId })
        ON CREATE SET c.text = $commentText,
                      c.at = $commentAt
        ON MATCH SET  c.text = $commentText,
                      c.at = $commentAt
      MERGE (u)-[r:WROTE]->(c)
      MERGE (c)-[r:ABOUT]->(m)
    `, {
      userId: this.toInt(userId),
      recipeId,
      commentId: this.toInt(comment.id),
      commentAt: this.toDate(comment.at),
      commentText: comment.text
    });
  }

  upsertCommentAboutComment(userId, commentId, comment) {
    return this.run(`
      MATCH (cc:Comment{ id: $commentId })
      MATCH (u:User{ id: $userId })
      MERGE (c:Comment{ id: $subCommentId })
        ON CREATE SET c.text = $subCommentText,
                      c.at = $subCommentAt
        ON MATCH SET  c.text = $subCommentText,
                      c.at = $subCommentAt
      MERGE (u)-[r:WROTE]->(c)
      MERGE (c)-[r:ABOUT]->(cc)
    `, {
      userId: this.toInt(userId),
      commentId: this.toInt(commentId),
      subCommentId: this.toInt(comment.id),
      subCommentAt: this.toDate(comment.at),
      subCommentText: comment.text
    });
  }
*/

  recommendRecipesByFriendTaste(userId, nb) {
    return this.run(`
        MATCH (:User{id: $userId})-[:KNOW]->(friend:User)-[l:LIKED]->(r2:Recipe)
        WITH r, size((rl)-[:USE]->(:Ingredient)<-[:USE]-(r)) AS nbIngredientShared
        WHERE l.rank > 3
        RETURN r, nbIngredientShared
        ORDER BY nbIngredientShared DESC
        LIMIT $nb
      `, {
        userId,
        nb,
    }).then((res) => {
      console.log(res.records);
      /*
      return res.records.map( record => {
        return {
          recipe: record.get('r').properties,
          count: record.get('count'),
        }
      });*/
    });
  }
  /*
        MATCH (:User{id: $userId})-[l:LIKED]->(rl:Recipe)-[:USE]->(:Ingredient)<-[:USE]-(r:recipe)
      WITH r, size((rl)-[:USE]->(:Ingredient)<-[:USE]-(r)) AS nbIngredientShared
      WHERE l.rank > 3
      RETURN r, nbIngredientShared
      ORDER BY nbIngredientShared DESC
      LIMIT $nb
      */

  recommendRecipesByIngredient(userId, nb) {
    return this.run(`
      MATCH (:User{id: $userId})-[l:LIKED]->(rl:Recipe)-[:USE]->(i:Ingredient)
      MATCH (r:Recipe)-[:USE]->(i:Ingredient)
      WHERE r <> rl AND l.rank > 3
      RETURN DISTINCT r.name AS recipe,count(rl) AS nbIngredientShared
      ORDER BY nbIngredientShared DESC
      LIMIT $nb
    `, {
      userId,
      nb,
    }).then((res) => {
      return res.records.map( record => {
        return {
          recipe: record.get('recipe'),
          count: record.get('nbIngredientShared'),
        }
      });
    });
  }

  toDate(value) {
    return neo4j.types.DateTime.fromStandardDate(value);
  }

  toInt(value) {
    return neo4j.int(value);
  }

  run(query, params) {
    const session = this.driver.session();
    return new Promise((resolve) => {
      session.run(query, params).then((result) => {
        session.close().then(() => resolve(result));
      });
    });
  }
}

module.exports = GraphDAO;