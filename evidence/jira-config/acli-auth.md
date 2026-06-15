# ACLI Authentication Evidence

**Date:** 2026-06-14  
**Author:** jira-admin  
**Task:** TASK 1 — Verify acli authentication

## Command Run

```
acli --version
acli jira auth status
```

## Output

```
acli version 1.3.19-stable

✓ Authenticated
  Site: myhealthcaresite.atlassian.net
  Email: kurry.tran@gmail.com
  Authentication Type: oauth
```

## Conclusion

acli v1.3.19-stable is installed at `/opt/homebrew/bin/acli` and is fully
authenticated to `myhealthcaresite.atlassian.net` via OAuth as
`kurry.tran@gmail.com`. Connectivity to the target staging site is confirmed.

Jira REST API was also tested via OAuth bearer token against the Atlassian
Cloud API (`api.atlassian.com/ex/jira/<cloudId>/rest/api/3`) and returned
HTTP 200 for project/AIGO/statuses.

**Cloud ID:** `76683cc1-6501-400f-8b59-01eaad4418d2`  
**Account ID:** `557058:297f331c-0582-4201-8db9-72c7ec72bf14`  
**Auth type:** OAuth (token expiry: 2026-06-15T00:54:55 EDT)
