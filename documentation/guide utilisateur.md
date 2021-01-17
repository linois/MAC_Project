
# Guide d'utilisation du bot duchemin

Dans un premier temps ajouter "duchemin_bot" dans votre liste de contact. Pour cela effectuer une recherche du bot, s�lectionner le, puis appuyer sur start se trouvant dans la partie
où on entre les messages g�n�ralement.

## Utiliser le bot

Le bot de base vous propose de faire des recherche en fonction de ce que vous entrer dans le champs texte. Mais il propose aussi une s�rie de commande.

### Recherche

Pour effectuer une recherche il vous suffit d'entre ```@duchemin_bot``` dans le chat suivie suivie du nom de la recette voulu. Il cherchera au mieux dans la BDD
en fonction de ce que vous taperez. Une liste plus ou moins grande vous sera propos�s en fonction de la requête, ou rien si la recette n'existe pas dans la BDD.
Vous pourrez s�lectionner alors la recette qui apparaitra avec ses d�tails et vous aurez la possibilit� de la not� de 1 � 5 �toile.

Vous pouvez aussi r�aliser cette commande dans le chat d'une autre personne pour le proposer la recette. Il verra alors les d�tails de la recette et pourra aussi la noter.

### Les commandes

Le bot offre plusieurs commande pour l'utilisateur:
* ```/help``` : Indique ce que fait le bot
* ````/start```` : Indique si le bot est lanc� et � quoi il sert
* ````/searchByIngredient```` : Permet de recherche une recette en fonction d'ingr�dient
* ````/searchRecipeShot```` : R�alise une recherche sur tous les plat demandant un temps de pr�paration cours (<=20 min)
* ````/searchRecipeMedium```` : R�alise une recherche sur tous les plats demandant un temps de pr�paration interm�diaire (21 � 60min)
* ````/searchRecipeLong```` : R�alise une recherche sur tous les plats demandant un temps de pr�paration long (>60 min)
* ````/searchLikedRecipe```` : Recherche les plats que vous avez aim�s.
* ````/toggleVegan```` : Passe � true ou � false si vous voulez filtrer les recettes non v�g�tariennes.
* ````/recommendRecipes```` : Le bot va vous recommander une recette en fonction des recettes que vous avez aim�es.
