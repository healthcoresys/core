#requires -Version 5.1
param(
	[string]$RepoUrl,
	[string]$Org,
	[string]$Name = "core",
	[ValidateSet('public','private','internal')]
	[string]$Visibility = 'private',
	[switch]$UseSSH
)

Write-Host "🚀 Push to GitHub starting..." -ForegroundColor Cyan

# Ensure git exists
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
	Write-Error "git is not installed or not in PATH. Install Git first."; exit 1
}

# Ensure we are at repo root (heuristic): check for package.json
if (-not (Test-Path -LiteralPath "package.json")) {
	Write-Warning "package.json not found in current directory. Continue anyway..."
}

# Add .gitignore entries for secrets and envs (idempotent)
$gitignorePath = ".gitignore"
$ignoreLines = @(
	"secrets/",
	".env*"
)
if (-not (Test-Path $gitignorePath)) { New-Item -Type File -Path $gitignorePath -Force | Out-Null }
$existing = Get-Content $gitignorePath -ErrorAction SilentlyContinue
$toAppend = $ignoreLines | Where-Object { $_ -and ($existing -notcontains $_) }
if ($toAppend.Count -gt 0) { Add-Content -Path $gitignorePath -Value ($toAppend -join [Environment]::NewLine) }

# Initialize git repo if needed
if (-not (Test-Path ".git")) {
	git init | Out-Null
}

# Set main as default branch
try { git branch -M main | Out-Null } catch {}

# Unstage sensitive paths if accidentally staged
try { git rm -r --cached secrets 2>$null } catch {}
try { git rm --cached .env* 2>$null } catch {}

# Stage and commit
 git add -A
if ((git status --porcelain) -ne $null) {
	git commit -m "feat: broker service (JWT/JWKS, health/sanity, security, docs)" | Out-Null
} else {
	Write-Host "No changes to commit." -ForegroundColor Yellow
}

function Set-Remote($url) {
	if ((git remote) -contains 'origin') {
		git remote set-url origin $url | Out-Null
	} else {
		git remote add origin $url | Out-Null
	}
}

# Resolve repo URL
if ($RepoUrl) {
	Write-Host "Using existing repo: $RepoUrl" -ForegroundColor Green
	Set-Remote -url $RepoUrl
} else {
	# Try to create via GitHub CLI
	if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
		Write-Error "GitHub CLI (gh) not found. Install: winget install GitHub.cli or https://cli.github.com/"
		Write-Host "Alternatively, create the repo manually and rerun with -RepoUrl https://github.com/<org>/<name>.git" -ForegroundColor Yellow
		exit 1
	}

	if (-not $Org) {
		Write-Error "Specify -Org <github-org-or-username> or provide -RepoUrl."; exit 1
	}

	$fullName = "$Org/$Name"
	Write-Host "Creating GitHub repo: $fullName ($Visibility)" -ForegroundColor Cyan
	$visFlag = switch ($Visibility) {
		'public' { '--public' }
		'private' { '--private' }
		'internal' { '--internal' }
	}
	$createArgs = @('repo','create', $fullName, $visFlag, '--source','.', '--push','--confirm')
	if ($UseSSH) {
		$createArgs += '--ssh'
	}
	$null = gh @createArgs

	# Determine remote URL
	$originUrl = (git remote get-url origin).Trim()
	if (-not $originUrl) {
		# Fallback to inferred URL
		$originUrl = if ($UseSSH) { "git@github.com:$fullName.git" } else { "https://github.com/$fullName.git" }
		Set-Remote -url $originUrl
	}
	Write-Host "Repo created and remote set to: $originUrl" -ForegroundColor Green
}

# Choose HTTPS vs SSH if user wants to switch
if ($UseSSH -and $RepoUrl -and ($RepoUrl -notmatch '^git@github.com')) {
	$sshUrl = $RepoUrl -replace '^https://github.com/', 'git@github.com:'
	Write-Host "Switching remote to SSH: $sshUrl" -ForegroundColor Cyan
	Set-Remote -url $sshUrl
}

# Push
Write-Host "Pushing to remote..." -ForegroundColor Cyan
 git push -u origin main
Write-Host "✅ Push complete." -ForegroundColor Green

Write-Host "\nNext steps:" -ForegroundColor Cyan
Write-Host "- Ensure Vercel project is connected and env vars are set." -ForegroundColor Gray
Write-Host "- Verify endpoints after deploy:" -ForegroundColor Gray
Write-Host "  https://core.healthcore.systems/.well-known/jwks.json" -ForegroundColor Gray
Write-Host "  https://core.healthcore.systems/api/health" -ForegroundColor Gray
Write-Host "  https://core.healthcore.systems/api/sanity?token=YOUR_ADMIN_TOKEN" -ForegroundColor Gray
