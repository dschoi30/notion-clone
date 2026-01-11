import { http, HttpResponse } from 'msw';

export const handlers = [
  // 인증 관련
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string };
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        email: body.email,
        name: 'Test User',
      },
    });
  }),

  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { email: string; password: string; name: string };
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: {
        id: 1,
        email: body.email,
        name: body.name,
      },
    }, { status: 201 });
  }),

  // 워크스페이스 관련
  http.get('/api/workspaces', () => {
    return HttpResponse.json({
      workspaces: [
        { id: 1, name: '워크스페이스 1' },
        { id: 2, name: '워크스페이스 2' },
      ],
    });
  }),

  http.post('/api/workspaces', async ({ request }) => {
    const body = await request.json() as { name: string };
    return HttpResponse.json({
      id: 3,
      name: body.name,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  // 문서 관련
  http.get('/api/documents', () => {
    return HttpResponse.json({
      documents: [
        { id: 1, title: '문서 1', content: '내용 1', workspaceId: 1 },
        { id: 2, title: '문서 2', content: '내용 2', workspaceId: 1 },
      ],
    });
  }),

  http.get('/api/documents/:id', ({ params }) => {
    const { id } = params;
    return HttpResponse.json({
      id: Number(id),
      title: `문서 ${id}`,
      content: `내용 ${id}`,
      workspaceId: 1,
    });
  }),

  http.post('/api/documents', async ({ request }) => {
    const body = await request.json() as { title?: string; workspaceId: number };
    return HttpResponse.json({
      id: 3,
      title: body.title || '제목 없음',
      content: '',
      workspaceId: body.workspaceId,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  }),

  http.put('/api/documents/:id', async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();
    return HttpResponse.json({
      id: Number(id),
      ...body,
      updatedAt: new Date().toISOString(),
    });
  }),

  http.delete('/api/documents/:id', () => {
    return HttpResponse.json({}, { status: 204 });
  }),

  // 사용자 관련
  http.get('/api/users', () => {
    return HttpResponse.json({
      users: [
        { id: 1, email: 'user1@example.com', name: 'User 1' },
        { id: 2, email: 'user2@example.com', name: 'User 2' },
      ],
    });
  }),

  // 알림 관련
  http.get('/api/notifications', () => {
    return HttpResponse.json({
      notifications: [],
    });
  }),
];

