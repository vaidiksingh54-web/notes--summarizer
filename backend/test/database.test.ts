import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import { SqliteRepository } from "../src/repository/sqliteRepository.js";
import type { Profile, StudyItem } from "../src/types.js";

test("SqliteRepository starts clean and supports persistence and full CRUD", () => {
  const tmpDbPath = path.resolve(process.cwd(), `backend/test_study_${Date.now()}.db`);
  try {
    const repo1 = new SqliteRepository(tmpDbPath);

    // 1. Verify fresh database starts clean with no hardcoded demo accounts or items
    assert.equal(repo1.findStudentByEmail("demo@cognistudy.ai"), undefined);

    // 2. Create student
    const profile: Profile = {
      name: "Maria Garcia",
      email: "maria@example.edu",
      phone: "+1 555-0188",
      college: "Tech University",
      course: "Data Science",
      age: 20,
      bio: "Student researcher",
      avatar: "MG",
    };
    const student = repo1.createStudent("maria@example.edu", "hash123", profile);
    assert.equal(student.profile.name, "Maria Garcia");
    assert.ok(repo1.isEmailTaken("maria@example.edu"));

    // 3. Create Session
    const token = repo1.createSession(student.id);
    assert.equal(repo1.getStudentIdForSession(token), student.id);

    // 4. Create, favorite, and list study items
    const note: StudyItem = {
      id: "note-maria-1",
      type: "note",
      title: "Linear Algebra & Eigenvalues",
      category: "Mathematics",
      date: "Today",
      progress: 100,
      isFavorite: false,
      tags: ["Math", "Matrices"],
      content: "<p>Spectral decomposition overview</p>",
    };
    repo1.createItem(student.id, note);
    assert.equal(repo1.listItems(student.id).length, 1);

    repo1.updateItem(student.id, "note-maria-1", { isFavorite: true });
    const favorites = repo1.listItems(student.id, "favorites");
    assert.equal(favorites.length, 1);
    assert.equal(favorites[0].isFavorite, true);

    // 5. Test Persistence across repository restarts
    const repo2 = new SqliteRepository(tmpDbPath);
    const persistedStudent = repo2.findStudentByEmail("maria@example.edu");
    assert.ok(persistedStudent, "Student should persist across repository instantiation");
    assert.equal(persistedStudent.profile.college, "Tech University");

    const persistedItems = repo2.listItems(persistedStudent.id);
    assert.equal(persistedItems.length, 1);
    assert.equal(persistedItems[0].title, "Linear Algebra & Eigenvalues");

    // 6. Delete item and session
    assert.ok(repo2.deleteItem(persistedStudent.id, "note-maria-1"));
    assert.equal(repo2.listItems(persistedStudent.id).length, 0);

    assert.ok(repo2.deleteSession(token));
    assert.equal(repo2.getStudentIdForSession(token), undefined);

    repo1.close();
    repo2.close();
  } finally {
    if (fs.existsSync(tmpDbPath)) {
      try {
        fs.unlinkSync(tmpDbPath);
      } catch (_e) {}
    }
  }
});
