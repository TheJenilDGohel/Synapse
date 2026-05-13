while ($true) {
    Write-Output "Scanning incoming PRs..."
    $prsRaw = gh pr list --state open --json number,mergeable --jq '.[]'
    if ($prsRaw) {
        # ConvertFrom-Json can handle multiple lines if wrapped in array
        $prs = $prsRaw | ConvertFrom-Json
        foreach ($pr in $prs) {
            $num = $pr.number
            if ($pr.mergeable -eq "MERGEABLE") {
                Write-Output "Merging clean PR #$num..."
                gh pr merge $num --squash --delete-branch
            } elseif ($pr.mergeable -eq "CONFLICTING") {
                Write-Output "Closing conflicted PR #$num..."
                gh pr close $num --delete-branch
            }
        }
    }
    Start-Sleep -Seconds 900
}