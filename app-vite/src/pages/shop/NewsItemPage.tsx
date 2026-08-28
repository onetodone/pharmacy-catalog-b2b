import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { date } from '@/lib/format'
import type { Post } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function NewsItemPage() {
  const { id } = useParams()
  const { data, isPending, isError } = useQuery({
    queryKey: ['posts', id],
    queryFn: async () => (await api.get<Post>(`/posts/${id}`)).data,
  })

  return (
    <div className="max-w-2xl">
      <Button asChild variant="ghost" size="sm" className="mb-4">
        <Link to="/news">
          <ArrowLeft /> Back to news
        </Link>
      </Button>
      {isPending && <Skeleton className="h-48" />}
      {isError && <p className="text-muted-foreground">Post not found.</p>}
      {data && (
        <Card>
          <CardHeader>
            <CardTitle>{data.title}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {data.author.name} · {date(data.createdAt)}
            </p>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed whitespace-pre-wrap">
            {data.content}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
