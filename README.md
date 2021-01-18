# MAC_Project

## Lancer le container MongoDB
Aller dans le dossier ```docker```
```shell
cd docker
```

Lancer le docker
```shell
docker-compose up -d
```
Cela va lancer l'image MongoDB permettant d'utiliser la document database.

## Enregistrement du bot
Si vous voulez réaliser votre propre bot, voici comment l'enregistrer:

1. Vous devez d'abord l'enregistrer sur Telegram, pour cela suivez la documentation.
1. Puis enregistrez votre bot sur BotFather
1. Ensuite nregistrez les commandes afin que le bot puisse vous les proposer:
1. Enfin lancer /setinline et /setinlinefeedback pour que le bot puisse répondre aux requêtes en ligne
1. Pour terminer copiez le jeton que le botfather vous a donné et allez sur https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates pour activer le vote actif sur votre bot. 

## Lancer le serveur du bot
Une fois le container lancé, lancez le bot
```shell
cd ../mac-bot-js
yarn run project-import
yarn run project-start
```
Le bot est maintenant utilisable, il ne reste plus qu'à l'utiliser dans vos conversations.
