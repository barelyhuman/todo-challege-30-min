import { OPTIONS } from '@/lib/constants'
import { del, get, post } from '@/lib/router'
import { loggedIn, optionalLoggedIn } from '@/middlewares/auth'
import { Request, Response } from 'express'

export class RootController {
  @get('/', [optionalLoggedIn])
  async index(req: Request, res) {
    if (req.currentUser?.id) {
      return res.redirect(302, '/tasks')
    }

    return res.redirect(302, '/login')
  }

  @get('/tasks', [loggedIn])
  async listTasksIndexView(req: Request, res: Response) {
    const tasks = await req.db.task.findMany({
      where: {
        userId: req.currentUser.id,
      },
      include: {
        user: {
          select: {
            email: true,
          },
        },
      },
    })

    const computedTasks = tasks.map(x => {
      const y = {
        ...x,
      }
      // @ts-ignore: check
      y.done = x.state === OPTIONS.TODO_STATES.done.value
      return y
    })

    return res.render('tasks/index.njk', {
      tasks: computedTasks,
    })
  }

  @get('/tasks/new', [loggedIn])
  createTasksView(req: Request, res: Response) {
    return res.render('tasks/create.njk')
  }

  @post('/tasks', [loggedIn])
  async addNewTask(req: Request, res: Response) {
    const content = req.body.content
    await req.db.task.create({
      data: {
        userId: req.currentUser.id,
        state: OPTIONS.TODO_STATES.notDone.value,
        content,
      },
    })
    return res.redirect(302, '/tasks')
  }

  @get('/tasks/:id/view', [loggedIn])
  async getTasksDetailsView(req: Request, res: Response) {
    const id = +req.params.id
    const taskDetails = await req.db.task.findFirst({
      where: {
        id: id,
        userId: req.currentUser.id,
      },
    })
    return res.render('tasks/show.njk', {
      task: taskDetails,
    })
  }

  @post('/tasks/:id', [loggedIn])
  async updateTaskState(req: Request, res: Response) {
    const _state = req.body.state
    const id = +req.params.id
    const content = req.body.content

    let state
    if (_state === 'on') {
      state = OPTIONS.TODO_STATES.done.value
    } else {
      state = OPTIONS.TODO_STATES.notDone.value
    }

    const taskDetails = await req.db.task.updateMany({
      data: {
        state: state,
        content,
      },
      where: {
        id: id,
        userId: req.currentUser.id,
      },
    })

    req.flash('info', 'Updated state')

    return res.redirect(302, '/tasks')
  }

  @get('/tasks/:id/delete', [loggedIn])
  async deleteTaskView(req: Request, res: Response) {
    const id = +req.params.id

    const taskDetails = await req.db.task.findFirst({
      where: {
        id: id,
        userId: req.currentUser.id,
      },
    })

    return res.render('tasks/delete.njk', {
      task: taskDetails,
    })
  }

  @post('/tasks/:id/delete', [loggedIn])
  async deleteTask(req: Request, res: Response) {
    const id = +req.params.id
    // Add a safety net for existence of task before deleting

    await req.db.task.deleteMany({
      where: {
        id: id,
        userId: req.currentUser.id,
      },
    })

    req.flash('info', 'Deleted')
    return res.redirect(302, '/tasks')
  }
}
