import { Router } from 'itty-router';

// @ts-expect-error its an html file
import index from './index.html';
import formHandler from './form-handler';

// now let's create a router (note the lack of "new")
const router = Router();

router.get('/', () => new Response(index, {
	headers: {
		"content-type": "text/html;charset=UTF-8",
	},
}));

router.post('/api/form', formHandler);

// 404 for everything else
router.all('*', () => new Response('Not Found.', { status: 404 }));

export default router;
