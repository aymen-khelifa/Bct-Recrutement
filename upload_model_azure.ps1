$username = "`$recrutement-ml"
$password = "kjEhz6FzGrsiJC1cQrjAR0gdCZvJtDMsFTfz5SPviCudWxFmmpW3t7qnpPCi"
$zipPath  = "bert_bct_model.zip"

# Changement critique : On upload dans wwwroot/models car le dossier site/models n'existe pas par défaut sur Azure.
$kuduUrl  = "https://recrutement-ml-bbgrckete3cbg0an.scm.francecentral-01.azurewebsites.net/api/zip/site/wwwroot/models/"

Write-Host "Upload en cours via curl.exe vers $kuduUrl..."
# Ajout de -i pour voir le code de réponse HTTP (ex: 200 OK)
curl.exe -i -X PUT -u "${username}:${password}" --data-binary "@$zipPath" "$kuduUrl" -k

Write-Host "`nTerminé. Regardez la réponse HTTP ci-dessus. Si c'est 200 OK, redémarrez l'App Service depuis le portail Azure."
