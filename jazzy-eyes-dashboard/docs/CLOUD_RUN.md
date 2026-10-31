# Cloud Run

Jazzy Eyes runs on Cloud Run service `jazzy-eyes` in GCP project
`acuity-health-prod` (region `us-east4`). It talks to database `jazzy_eyes` on
Cloud SQL instance `acuity-health-prod:us-east4:onlinedoctornote-db` over the
Cloud SQL unix socket.

| What       | Value                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------- |
| URL        | https://jazzy-eyes-1006405058436.us-east4.run.app                                            |
| Service    | `jazzy-eyes`, public via `--no-invoker-iam-check`, 0 to 2 instances                          |
| Runtime SA | `jazzy-eyes@`: `roles/cloudsql.client`, `secretAccessor` on its three secrets                |
| Deploy SA  | `jazzy-eyes-deploy@`: builds, migrates and deploys; GitHub signs in as it                    |
| Database   | `jazzy_eyes`, login `jazzy_app`                                                              |
| Secrets    | `jazzy-eyes-database-url`, `jazzy-eyes-admin-email`, `jazzy-eyes-admin-password`             |
| Images     | `us-east4-docker.pkg.dev/acuity-health-prod/jazzy-eyes/jazzy-eyes`                           |

## How a deploy works

Every push to `main` runs `.github/workflows/deploy.yml`. It runs the tests,
then signs in through workload identity provider
`github-actions/jazzy-eyes-production`, which accepts only this repo, `main`,
`deploy.yml` and the `production` environment. It then runs
`jazzy-eyes-dashboard/cloudbuild.yaml`, which:

1. Builds the `runtime` target of the `Dockerfile` (Next.js `output: 'standalone'`).
2. Runs `scripts/migrate.ts` from the `migrate` target through the Cloud SQL
   Auth Proxy, with the same `DATABASE_URL` secret the service uses.
3. Deploys the image to `jazzy-eyes`.

Migrations only go forward, so a schema change must work with the code that is
still running.

To roll back without a build, send traffic to an earlier revision:

```bash
gcloud run services update-traffic jazzy-eyes --region=us-east4 --project=acuity-health-prod --to-revisions=<revision>=100
```

Undo the pin with `--to-latest`, or new revisions get no traffic.

## Changing a secret

Add a version, then start a new revision so it is read:

```bash
gcloud run services update jazzy-eyes --region=us-east4 --project=acuity-health-prod --update-secrets=ADMIN_PASSWORD=jazzy-eyes-admin-password:latest
```

## Connecting from a laptop

Run the Cloud SQL Auth Proxy and use a TCP URL. Over the instance's public IP,
pg needs `?uselibpqcompat=true&sslmode=require`: the instance requires
encryption and pg verifies plain `sslmode=require` against public CAs.

## History

- Production's migration history moved from Prisma to the runner on 2026-10-31:
  `scripts/record-baseline.ts` recorded `0001_baseline`, then `migrate` applied
  `0002_drop_prisma_migrations`.
- Vercel served the app until the Cloud Run cutover. `vercel.json` redirects
  `jazzy-eyes.vercel.app` here; delete it with the Vercel project after
  2026-11-07.
