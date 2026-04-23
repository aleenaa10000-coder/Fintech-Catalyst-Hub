import { Router, type IRouter } from "express";
import healthRouter from "./health";
import blogRouter from "./blog";
import pricingRouter from "./pricing";
import servicesRouter from "./services";
import testimonialsRouter from "./testimonials";
import statsRouter from "./stats";
import contactRouter from "./contact";
import guestPostsRouter from "./guestPosts";

const router: IRouter = Router();

router.use(healthRouter);
router.use(blogRouter);
router.use(pricingRouter);
router.use(servicesRouter);
router.use(testimonialsRouter);
router.use(statsRouter);
router.use(contactRouter);
router.use(guestPostsRouter);

export default router;
