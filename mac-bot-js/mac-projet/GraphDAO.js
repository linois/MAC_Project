
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
      isBot: user.is_bot,
      username: user.username,
      isVege: user.is_vege,
      userId: this.toInt(user.id),
      likedRank: liked.rank,
      likedAt: this.toDate(liked.at),
    });
  }

  getTopRecipeLiked(userId, nb) {
    return this.run('MATCH (:User{id: $userId})-[l:LIKED]-(r:Recipe) RETURN r,l ORDER BY l.rank AND l.at DESC LIMIT $nb', {
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

  getTopFamousRecipes(topSize) {
    return this.run('MATCH (:User)-[l:LIKED]-(r:Recipe) WITH r, sum(l.rank) AS vote, avg(l.rank) AS avg RETURN r, avg ORDER BY vote DESC LIMIT $topSize', {
      topSize,
    }).then((res) => {
      if (res.records.length === 0) return null;
      else {
        return res.records.map( record => {
          return {
            recipeId: record.get('r').properties.id,
            avg: record.get('avg'),
          }
        });
      }
    });
  }

  getRecipesByIngredient(ingredientName) {
    return this.run('MATCH (:Ingredient{name: $ingredientName})-[:USE]-(r:Recipe) RETURN r', {
      ingredientName,
    }).then((res) => {
      if (res.records.length === 0) return null;
      else {
        return res.records.map( record => record.get('r').properties.id);
      }
    });
  }

  upsertRecipe(recipeId, recipeName) {
    return this.run('MERGE (r:Recipe{id: $recipeId}) ON CREATE SET r.name = $recipeName RETURN r', {
      recipeId,
      recipeName,
    })
  }

  upsertIngredient(recipeId, ingredient) {
    return this.run(`
      MATCH (r:Recipe{ id: $recipeId })
      MERGE (i:Ingredient{id: $ingredientId})
        ON CREATE SET i.name = $ingredientName
      MERGE (r)-[:USE]->(i)
    `, {
      recipeId,
      ingredientId: ingredient.id,
      ingredientName: ingredient.name,
    });
  }

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
      isVege: user.is_vege,
      isBot: user.is_bot,
    });
  }

  upsertAdded(userId, recipeId, added) {
    return this.run(`
      MATCH (m:Recipe{ id: $recipeId })
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

  recommendRecipes(userId) {
   return this.run(`
      match (u:User{id: $userId})-[l:LIKED]->(r:Recipe)
      return r, count(*)
      order by count(*) desc
      limit 5
    `, {
      userId
    }).then((result) => result.records);
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