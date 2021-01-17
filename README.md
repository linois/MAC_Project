# MAC_Project

## Lancer le container MongoDB
Aller dans le dossier ```docker```
```shell
cd docker
```

Faire un pull de l'image Mongo
```shell
docker pull mongo:latest
```

Lancer le docker
```shell
docker-compose up -d
```


## Se connecter à la db
Une fois le container lancé, connectez-vous à la db
```shell
docker exec -it db-recettes bash

mongo -u mac_user -p mac_project_2020 --authenticationDatabase db-recettes
```

## Enregistrement du bot

Vous devez d'abord l'enregistrer sur Telegram, pour cela suivez la documentation.
Puis enregistrez votre bot sur BotFather
Ensuite nregistrez les commandes afin que le bot puisse vous les proposer:
Enfin lancer /setinline et /setinlinefeedback pour que le bot puisse répondre aux requêtes en ligne
Pour terminer copiez le jeton que le botfather vous a donné et allez sur https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates pour activer le vote actif sur votre bot. 

## Lancement

Il vous suffit de lancer les commandes
`yarn run project-import`
`yarn run project-start`
