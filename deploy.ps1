Set-Location $PSScriptRoot
wrangler pages deploy . --project-name pink-workbench --branch main --commit-message "update"
Write-Host "官方地址: https://pink-workbench.pages.dev"
