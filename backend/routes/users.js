const express = require("express");
const router = express.Router();
const userController = require("../controllers/users");

// CRUD
router.get("/", userController.getAllUsers);
router.get("/:id", userController.getUserById);
router.post("/", userController.addUser);
router.put("/:id", userController.updateUser);
router.delete("/:id", userController.deleteUser);

// Search + Filter
router.get("/search/query", userController.searchUser);
router.get("/filter/service", userController.filterByMainService);
router.get("/filter/status", userController.filterByStatus);
router.get("/filter/role", userController.filterByRole);

module.exports = router;
