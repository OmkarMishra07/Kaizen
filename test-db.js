const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const users = await prisma.user.findMany()
  if (users.length === 0) return console.log('No users')
  const user = users[0]
  
  const snaps = await prisma.problemSolvedSnapshot.findMany({
    include: { platformAccount: true }
  })
  console.log('SNAPSHOTS:')
  for (const s of snaps) {
    console.log(`- ${s.platformAccount.platform}: Total=${s.totalSolved}, Easy=${s.easySolved}, Med=${s.mediumSolved}, Hard=${s.hardSolved}, Topics=${s.topicBreakdown ? 'yes' : 'no'}`)
    if (s.platformAccount.platform === 'GITHUB') {
      console.log(`  rawStats: ${s.rawStats ? s.rawStats.substring(0, 100) + '...' : 'null'}`)
    }
  }

  const topics = await prisma.topicCoverage.findMany()
  console.log('\nTOPIC COVERAGE:')
  let totalTopics = 0
  for (const t of topics) {
    totalTopics += t.totalSolved
    if (t.totalSolved > 0) {
      console.log(`- ${t.topic}: ${t.totalSolved}`)
    }
  }
  console.log(`Sum of all topic coverage totalSolved: ${totalTopics}`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
