import { config } from 'dotenv'
import { MigrationError, recordProductionBaseline } from '@/db/migrate'

config({ path: ['.env.local', '.env'], quiet: true })

async function main() {
  try {
    const result = await recordProductionBaseline()
    console.log(
      result.recorded ? 'Recorded the baseline as applied.' : 'The baseline was already recorded.'
    )
  } catch (error) {
    if (error instanceof MigrationError) {
      console.error(`Record baseline refused (${error.reason}): ${error.message}`)
      process.exitCode = 1
      return
    }
    throw error
  }
}

main()
