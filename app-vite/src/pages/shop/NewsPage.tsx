import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { date } from '@/lib/format'
import type { Paginated, Post } from '@/lib/types'
import { PageHeader } from '@/components/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function NewsPage() {
  const { data, isPending } = useQuery({
    queryKey: ['posts', 'shop'],
    queryFn: async () =>
      (await api.get<Paginated<Post>>('/posts', { params: { pageSize: 50 } }))
        .data,
  })

  return (
    <div>
      <PageHeader title="News" description="Updates from the platform." />
      <div className="space-y-4">
        {isPending &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        {data?.data.map((post) => (
          <Card key={post.id}>
            <CardHeader>
              <CardTitle>
                <Link to={`/news/${post.id}`} className="hover:underline">
                  {post.title}
                </Link>
              </CardTitle>
              <p className="text-xs text-muted-foreground">
                {post.author.name} · {date(post.createdAt)}
              </p>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {post.content.length > 240
                ? `${post.content.slice(0, 240)}…`
                : post.content}
            </CardContent>
          </Card>
        ))}
        {data && data.data.length === 0 && (
          <p className="py-12 text-center text-muted-foreground">
            No news yet.
          </p>
        )}
      </div>
    </div>
  )
}
