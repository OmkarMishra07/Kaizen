import { Platform, ProblemStats, SyncResult } from '@/lib/types'

export interface PlatformAdapter {
  platform: Platform
  fetchStats(handle: string, metadata?: Record<string, string>): Promise<SyncResult>
}

function parseTopicBreakdown(raw: Record<string, unknown> | undefined): ProblemStats['topicBreakdown'] {
  if (!raw) return undefined
  const breakdown: Record<string, { easy: number; medium: number; hard: number }> = {}
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'object' && value !== null && 'easy' in value && 'medium' in value && 'hard' in value) {
      breakdown[key] = {
        easy: (value as { easy: number }).easy || 0,
        medium: (value as { medium: number }).medium || 0,
        hard: (value as { hard: number }).hard || 0,
      }
    }
  }
  return Object.keys(breakdown).length > 0 ? breakdown : undefined
}

function computeStreakFromDates(dates: Date[]): { currentStreak: number; longestStreak: number } {
  if (dates.length === 0) return { currentStreak: 0, longestStreak: 0 }
  
  // Normalize dates to local YYYY-MM-DD
  const dateStrings = dates.map(d => {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  })
  
  const dateSet = new Set(dateStrings)
  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  
  let currentStreak = 0
  let checkDate = new Date(today)
  
  if (!dateSet.has(todayStr)) {
    checkDate.setDate(checkDate.getDate() - 1)
  }
  
  for (let i = 0; i < 1000; i++) {
    const dStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
    if (dateSet.has(dStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  
  const sorted = Array.from(dateSet).sort()
  let longestStreak = 0
  let tempStreak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays === 1) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)
  
  return { currentStreak, longestStreak }
}

// ─── Codeforces Adapter ──────────────────────────────────────────────

export class CodeforcesAdapter implements PlatformAdapter {
  platform: Platform = 'CODEFORCES'

  async fetchStats(handle: string): Promise<SyncResult> {
    try {
      const [userRes, statusRes] = await Promise.all([
        fetch(`https://codeforces.com/api/user.info?handles=${handle}`),
        fetch(`https://codeforces.com/api/user.status?handle=${handle}&from=1&count=10000`),
      ])

      if (!userRes.ok) {
        throw new Error(`Codeforces API returned ${userRes.status}`)
      }

      const userData = await userRes.json()
      const statusData = await statusRes.json()

      if (userData.status !== 'OK' || !userData.result?.[0]) {
        throw new Error('Invalid Codeforces handle or API error')
      }

      const user = userData.result[0]
      const submissions = statusData.result || []

      const problemsByRating: Record<string, number> = {}
      const solvedSet = new Set<string>()

      const topicMap: Record<string, { easy: number; medium: number; hard: number }> = {}

      for (const sub of submissions) {
        if (sub.verdict !== 'OK') continue
        const key = `${sub.problem.contestId}-${sub.problem.index}`
        if (solvedSet.has(key)) continue
        solvedSet.add(key)

        const rating = sub.problem.rating || 0
        problemsByRating[rating] = (problemsByRating[rating] || 0) + 1

        const tags = sub.problem.tags || []
        const diff = rating <= 1200 ? 'easy' : rating <= 1800 ? 'medium' : 'hard'
        for (const tag of tags) {
          if (!topicMap[tag]) topicMap[tag] = { easy: 0, medium: 0, hard: 0 }
          topicMap[tag][diff]++
        }
      }

      const totalSolved = solvedSet.size
      const easySolved = Object.entries(problemsByRating)
        .filter(([r]) => parseInt(r) <= 1200)
        .reduce((sum, [, c]) => sum + c, 0)
      const mediumSolved = Object.entries(problemsByRating)
        .filter(([r]) => parseInt(r) > 1200 && parseInt(r) <= 1800)
        .reduce((sum, [, c]) => sum + c, 0)
      const hardSolved = Object.entries(problemsByRating)
        .filter(([r]) => parseInt(r) > 1800)
        .reduce((sum, [, c]) => sum + c, 0)

      const cfToGeneric: Record<string, string[]> = {
        'binary search': ['Binary Search'],
        'two pointers': ['Two Pointers'],
        'dp': ['Dynamic Programming'],
        'graphs': ['Graphs'],
        'trees': ['Trees'],
        'greedy': ['Greedy'],
        'data structures': ['Heaps / Priority Queues', 'Tries'],
        'hashing': ['Arrays', 'Strings'],
        'math': ['Arrays'],
        'sortings': ['Arrays'],
        'strings': ['Strings'],
        'implementation': ['Arrays', 'Strings'],
        'brute force': ['Backtracking'],
        'divide and conquer': ['Trees', 'Dynamic Programming'],
        'number theory': ['Arrays'],
        'combinatorics': ['Arrays', 'Dynamic Programming'],
        'dsu': ['Graphs'],
        'shortest paths': ['Graphs'],
        'dfs': ['Trees', 'Graphs', 'Backtracking'],
        'bfs': ['Trees', 'Graphs'],
        'string suffix structures': ['Strings', 'Tries'],
      }

      const genericTopics: Record<string, { easy: number; medium: number; hard: number }> = {}
      for (const [cfTag, breakdown] of Object.entries(topicMap)) {
        const mapped = cfToGeneric[cfTag] || []
        for (const topic of mapped) {
          if (!genericTopics[topic]) genericTopics[topic] = { easy: 0, medium: 0, hard: 0 }
          genericTopics[topic].easy += breakdown.easy
          genericTopics[topic].medium += breakdown.medium
          genericTopics[topic].hard += breakdown.hard
        }
      }

      const subDates = submissions
        .filter((s: any) => s.verdict === 'OK')
        .map((s: any) => new Date(s.creationTimeSeconds * 1000))
      const { currentStreak, longestStreak } = computeStreakFromDates(subDates)

      const data: ProblemStats = {
        easySolved,
        mediumSolved,
        hardSolved,
        totalSolved,
        rating: user.rating || undefined,
        contestCount: user.contestCount || 0,
        topicBreakdown: genericTopics,
        rawStats: {
          handle: user.handle,
          rank: user.rank,
          maxRating: user.maxRating,
          ratingChanges: user.ratingChanges?.length || 0,
          currentStreak,
          longestStreak,
        },
      }

      return {
        platform: 'CODEFORCES',
        status: 'SUCCESS',
        message: `Synced ${totalSolved} problems, rating: ${user.rating || 'Unrated'}`,
        data,
      }
    } catch (error) {
      return {
        platform: 'CODEFORCES',
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'Codeforces sync failed',
      }
    }
  }
}

// ─── GitHub Adapter ───────────────────────────────────────────────────

export class GitHubAdapter implements PlatformAdapter {
  platform: Platform = 'GITHUB'

  async fetchStats(handle: string, metadata?: Record<string, string>): Promise<SyncResult> {
    try {
      const token = metadata?.token || process.env.GITHUB_TOKEN || ''
      const headers: Record<string, string> = {
        Accept: 'application/vnd.github.v3+json',
      }
      if (token) headers.Authorization = `token ${token}`

      const userRes = await fetch(`https://api.github.com/users/${handle}`, { headers })
      if (!userRes.ok) throw new Error(`GitHub API returned ${userRes.status}`)

      const userData = await userRes.json()
      const repoCount = userData.public_repos || 0
      const stars = userData.total_stars || 0

      const reposRes = await fetch(
        `https://api.github.com/users/${handle}/repos?per_page=100&sort=updated`,
        { headers }
      )
      const repos = reposRes.ok ? await reposRes.json() : []

      const eventsRes = await fetch(
        `https://api.github.com/users/${handle}/events/public?per_page=100`,
        { headers }
      )
      const events = eventsRes.ok ? await eventsRes.json() : []

      const pushEvents = events.filter((e: { type: string }) => e.type === 'PushEvent')
      const recentCommits = pushEvents.length

      const eventDates = pushEvents.map((e: any) => new Date(e.created_at))
      const { currentStreak, longestStreak } = computeStreakFromDates(eventDates)

      const languages: Record<string, number> = {}
      for (const repo of repos) {
        if (repo.language) {
          languages[repo.language] = (languages[repo.language] || 0) + 1
        }
      }

      const reposWithReadme = repos.filter((r: { has_readme?: boolean }) => r.has_readme).length
      const totalRepoSize = repos.reduce((sum: number, r: { size: number }) => sum + r.size, 0)

      const data: ProblemStats = {
        easySolved: repos.length,
        mediumSolved: recentCommits,
        hardSolved: stars,
        totalSolved: repoCount,
        rating: undefined,
        contestCount: 0,
        rawStats: {
          repos: repos.length,
          recentCommits,
          stars,
          languages,
          reposWithReadme,
          totalRepoSize,
          currentStreak,
          longestStreak,
          topRepos: repos.slice(0, 5).map((r: { name: string; html_url: string; description: string | null; stargazers_count: number; language: string | null }) => ({
            name: r.name,
            url: r.html_url,
            description: r.description,
            stars: r.stargazers_count,
            language: r.language,
          })),
        },
      }

      return {
        platform: 'GITHUB',
        status: 'SUCCESS',
        message: `Synced ${repoCount} repos, ${recentCommits} recent commits`,
        data,
      }
    } catch (error) {
      return {
        platform: 'GITHUB',
        status: 'FAILED',
        message: error instanceof Error ? error.message : 'GitHub sync failed',
      }
    }
  }
}

// ─── LeetCode Adapter ────────────────────────────────────────────────

export class LeetCodeAdapter implements PlatformAdapter {
  platform: Platform = 'LEETCODE'

  async fetchStats(handle: string): Promise<SyncResult> {
    try {
      const query = `
        query getUserProfile($username: String!) {
          allQuestionsCount { difficulty count }
          matchedUser(username: $username) {
            contributions { points }
            profile { reputation ranking }
            userCalendar { submissionCalendar }
            submitStats {
              acSubmissionNum { difficulty count submissions }
            }
            tagProblemCounts {
              advanced { tagName problemsSolved }
              intermediate { tagName problemsSolved }
              fundamental { tagName problemsSolved }
            }
          }
        }
      `

      const contestQuery = `
        query userContestRankingInfo($username: String!) {
          userContestRanking(username: $username) {
            attendedContestsCount
            rating
            globalRanking
            topPercentage
          }
        }
      `

      const [profileRes, contestRes] = await Promise.all([
        fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query, variables: { username: handle } }),
        }),
        fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: contestQuery, variables: { username: handle } }),
        }),
      ])

      if (!profileRes.ok) throw new Error(`LeetCode GraphQL returned ${profileRes.status}`)

      const profileData = await profileRes.json()
      const contestData = contestRes.ok ? await contestRes.json() : null

      if (!profileData.data?.matchedUser) {
        throw new Error('LeetCode user not found')
      }

      const user = profileData.data.matchedUser
      const submissionStats = user.submitStats?.acSubmissionNum || []

      let easySolved = 0
      let mediumSolved = 0
      let hardSolved = 0

      for (const stat of submissionStats) {
        if (stat.difficulty === 'Easy') easySolved = stat.count
        else if (stat.difficulty === 'Medium') mediumSolved = stat.count
        else if (stat.difficulty === 'Hard') hardSolved = stat.count
      }

      const totalSolved = easySolved + mediumSolved + hardSolved

      const contestInfo = contestData?.data?.userContestRanking
      const rating = contestInfo?.rating || undefined
      const contestCount = contestInfo?.attendedContestsCount || 0

      const topicQuery = `
        query skillStats($username: String!) {
          matchedUser(username: $username) {
            tagProblemCounts {
              advanced {
                tagName
                problemsSolved
              }
              intermediate {
                tagName
                problemsSolved
              }
              fundamental {
                tagName
                problemsSolved
              }
            }
          }
        }
      `

      let topicBreakdown: ProblemStats['topicBreakdown'] = undefined
      try {
        const topicRes = await fetch('https://leetcode.com/graphql', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: topicQuery, variables: { username: handle } }),
        })
        if (topicRes.ok) {
          const topicData = await topicRes.json()
          const tagData = topicData.data?.matchedUser?.tagProblemCounts
          if (tagData) {
            // Map each LC tag to ONE directly-related generic topic only.
            // Tags like Hash Table, Stack, Math, Sorting are NOT mapped to Arrays
            // because they represent different skills and would inflate the count.
            const lcToGeneric: Record<string, string> = {
              'Array': 'Arrays',
              'Matrix': 'Arrays',
              'String': 'Strings',
              'Tree': 'Trees',
              'Binary Tree': 'Trees',
              'Binary Search Tree': 'Trees',
              'Segment Tree': 'Trees',
              'Binary Indexed Tree': 'Trees',
              'Graph': 'Graphs',
              'Breadth-First Search': 'Graphs',
              'Depth-First Search': 'Graphs',
              'Union Find': 'Graphs',
              'Topological Sort': 'Graphs',
              'Minimum Spanning Tree': 'Graphs',
              'Dynamic Programming': 'Dynamic Programming',
              'Memoization': 'Dynamic Programming',
              'Heap (Priority Queue)': 'Heaps / Priority Queues',
              'Heap': 'Heaps / Priority Queues',
              'Priority Queue': 'Heaps / Priority Queues',
              'Trie': 'Tries',
              'Backtracking': 'Backtracking',
              'Recursion': 'Backtracking',
              'Greedy': 'Greedy',
              'Binary Search': 'Binary Search',
              'Two Pointers': 'Two Pointers',
              'Sliding Window': 'Sliding Window',
            }

            // Use Math.max when multiple LC tags map to the same generic topic,
            // because they heavily overlap (e.g. "Tree" 16 and "Binary Tree" 16
            // are largely the SAME problems, not 32 distinct problems).
            const generic: Record<string, { easy: number; medium: number; hard: number }> = {}
            const allTags = [
              ...(tagData.fundamental || []),
              ...(tagData.intermediate || []),
              ...(tagData.advanced || []),
            ]

            const totalSolvedSum = easySolved + mediumSolved + hardSolved
            const easyRatio = totalSolvedSum > 0 ? easySolved / totalSolvedSum : 0
            const medRatio = totalSolvedSum > 0 ? mediumSolved / totalSolvedSum : 0

            for (const tag of allTags) {
              const genericTopic = lcToGeneric[tag.tagName]
              if (genericTopic) {
                const solved = tag.problemsSolved || 0
                const approxEasy = Math.round(solved * easyRatio)
                const approxMed = Math.round(solved * medRatio)
                const approxHard = Math.max(0, solved - approxEasy - approxMed)

                if (!generic[genericTopic]) {
                  generic[genericTopic] = { easy: approxEasy, medium: approxMed, hard: approxHard }
                } else {
                  // Take the MAX of each difficulty, not the sum, since overlapping tags
                  // count the same problems multiple times
                  generic[genericTopic].easy = Math.max(generic[genericTopic].easy, approxEasy)
                  generic[genericTopic].medium = Math.max(generic[genericTopic].medium, approxMed)
                  generic[genericTopic].hard = Math.max(generic[genericTopic].hard, approxHard)
                }
              }
            }
            topicBreakdown = generic
          }
        }
      } catch {
        // Topic breakdown is best-effort for LeetCode
      }

      const rawCalendar = user.userCalendar?.submissionCalendar
      let currentStreak = 0, longestStreak = 0
      if (rawCalendar) {
        try {
          const calObj = JSON.parse(rawCalendar)
          const dates = Object.keys(calObj).map(ts => new Date(parseInt(ts) * 1000))
          const streaks = computeStreakFromDates(dates)
          currentStreak = streaks.currentStreak
          longestStreak = streaks.longestStreak
        } catch (e) {
          console.error('Failed to parse LeetCode calendar', e)
        }
      }

      const data: ProblemStats = {
        easySolved,
        mediumSolved,
        hardSolved,
        totalSolved,
        rating: rating ? Math.round(rating) : undefined,
        contestCount,
        topicBreakdown: parseTopicBreakdown(topicBreakdown as Record<string, unknown> | undefined),
        rawStats: {
          handle: user.username,
          ranking: user.profile?.ranking,
          reputation: user.profile?.reputation,
          contestBadge: user.contestBadge?.name,
          topPercentage: contestInfo?.topPercentage,
          currentStreak,
          longestStreak,
        },
      }

      return {
        platform: 'LEETCODE',
        status: 'SUCCESS',
        message: `Synced ${totalSolved} problems, contest rating: ${rating || 'N/A'}`,
        data,
      }
    } catch (error) {
      return {
        platform: 'LEETCODE',
        status: 'FAILED',
        message: `⚠️ Unofficial API — ${error instanceof Error ? error.message : 'LeetCode sync failed'}`,
      }
    }
  }
}

// ─── Manual / Fallback Adapter ────────────────────────────────────────

export class ManualAdapter implements PlatformAdapter {
  platform: Platform

  constructor(platform: Platform) {
    this.platform = platform
  }

  async fetchStats(_handle: string): Promise<SyncResult> {
    return {
      platform: this.platform,
      status: 'FAILED',
      message: `${_handle === 'GFG' ? 'GeeksforGeeks' : 'HackerRank'} has no reliable API. Use manual entry to add stats.`,
    }
  }
}

// ─── Adapter Factory ────────────────────────────────────────────────

const adapters: Map<Platform, PlatformAdapter> = new Map([
  ['CODEFORCES', new CodeforcesAdapter()],
  ['GITHUB', new GitHubAdapter()],
  ['LEETCODE', new LeetCodeAdapter()],
  ['GFG', new ManualAdapter('GFG')],
  ['HACKERRANK', new ManualAdapter('HACKERRANK')],
])

export function getAdapter(platform: Platform): PlatformAdapter {
  return adapters.get(platform) || new ManualAdapter(platform)
}
