# JQL Filters

Reusable JQL for boards, automation, and the weekly readout. Replace `AIGO`
with your project key if different (see `AIGO_PROJECT_KEY` in `src/config.ts`).

## Triage & intake

```
# Newly created, untriaged
project = AIGO AND created >= -7d AND statusCategory = "To Do" ORDER BY created DESC

# Needs human review
project = AIGO AND status = "Needs Human Review" ORDER BY updated DESC

# Missing info
project = AIGO AND status = "Needs Info" ORDER BY updated DESC
```

## Weekly readout (default)

```
project = AIGO AND updated >= -7d ORDER BY updated DESC
```

## By workflow area / type

```
project = AIGO AND issuetype = Experiment AND statusCategory != Done ORDER BY due ASC
project = AIGO AND issuetype = "Creative Request" ORDER BY updated DESC
project = AIGO AND issuetype = "Claims Review" ORDER BY priority DESC
project = AIGO AND issuetype = "Employer Launch" AND due <= 14d ORDER BY due ASC
project = AIGO AND issuetype = "Signup Funnel Issue" ORDER BY priority DESC
project = AIGO AND issuetype = "Dashboard Request" ORDER BY created DESC
```

## Risk & launch readiness

```
# Due soon and not in progress
project = AIGO AND due <= 3d AND status != "In Progress" AND statusCategory != Done

# Blocked
project = AIGO AND (status = Blocked OR labels = blocked) ORDER BY updated DESC

# Claims risk flagged (label-based MVP)
project = AIGO AND labels in ("claims-risk", "claims-review") ORDER BY priority DESC
```

## Duplicate detection candidate pool

The `findSimilarIssues` action uses, per issue:

```
project = "<projectKey>" AND key != "<issueKey>" AND updated >= -90d ORDER BY updated DESC
```
