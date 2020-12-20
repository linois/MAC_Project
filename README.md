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

Depuis là, vous pouvez faire les opérations voulues sur la db.