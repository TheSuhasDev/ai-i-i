import { Router } from "express";
import { protect, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";

export function crudRouter(
  crud,
  {
    createSchema,
    updateSchema,
    createRoles = ["admin", "manager"],
    updateRoles = ["admin", "manager"],
    deleteRoles = ["admin"],
  }
) {
  const router = Router();
  router.use(protect);
  router.get("/", crud.list);
  router.get("/:id", crud.getOne);
  router.post("/", authorize(...createRoles), validate(createSchema), crud.create);
  router.put("/:id", authorize(...updateRoles), validate(updateSchema), crud.update);
  router.delete("/:id", authorize(...deleteRoles), crud.remove);
  return router;
}