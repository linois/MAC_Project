db.createUser(
    {
        user:   "mac_user",
        pwd:    "mac_project_2020",
        roles: [
            {
                role:   "readWrite",
                db:     "db-recettes"
            }
        ]
    }
)