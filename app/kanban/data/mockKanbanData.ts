import type { ApiKanbanBootstrapDto } from "../types/kanban.dto";

export const mockKanbanBootstrapDto: ApiKanbanBootstrapDto = {
  user: {
    id: "user-001",
    full_name: "Jordan Brooks",
    email: "jordan.brooks@cyclerent.io",
    role: "Operations Manager",
  },
  columns: [
    { id: "to-prep", key: "TO_PREP", title: "To Prep", order: 1 },
    { id: "ready-for-rent", key: "READY_FOR_RENT", title: "Ready for Rent", order: 2 },
    { id: "out-for-ride", key: "OUT_FOR_RIDE", title: "Out for a Ride", order: 3 },
    { id: "return-from-ride", key: "RETURN_FROM_RIDE", title: "Return from a Ride", order: 4 },
    { id: "done", key: "DONE", title: "Done", order: 5 },
  ],
  tasks: [
    {
      id: "task-001",
      title: "Inspect brake pads - City Bike #12",
      status_id: "to-prep",
      assignee_name: "Alex Miller",
      due_date: "2026-02-12",
      description:
        "Complete safety inspection checklist and replace pads if wear indicator is visible.",
    },
    {
      id: "task-002",
      title: "Install child seat on Family Cargo #3",
      status_id: "to-prep",
      assignee_name: "Daria Kent",
      due_date: "2026-02-13",
      description:
        "Verify frame compatibility and torque bolts to manufacturer settings before release.",
    },
    {
      id: "task-003",
      title: "Weekend trail package booking",
      status_id: "ready-for-rent",
      assignee_name: "Nina Cole",
      due_date: "2026-02-11",
      description:
        "Customer confirmed pickup at 10:00. Include helmet set and navigation mount in package.",
    },
    {
      id: "task-004",
      title: "Road Bike #21 prepared for pickup",
      status_id: "ready-for-rent",
      assignee_name: "Leo Park",
      due_date: "2026-02-12",
      description:
        "Final tire pressure check and add spare tube kit to the front pouch.",
    },
    {
      id: "task-005",
      title: "Tour group - 4 bikes active rental",
      status_id: "out-for-ride",
      assignee_name: "Mia Wong",
      due_date: "2026-02-11",
      description:
        "Track active rentals and keep emergency contact details visible for support shift.",
    },
    {
      id: "task-006",
      title: "Evening city tour fleet deployed",
      status_id: "out-for-ride",
      assignee_name: "Noah Reed",
      due_date: "2026-02-11",
      description:
        "Monitor return windows for all riders and send reminder 30 minutes before due time.",
    },
    {
      id: "task-007",
      title: "Receive returned Gravel Bike #8",
      status_id: "return-from-ride",
      assignee_name: "Ivy Lopez",
      due_date: "2026-02-11",
      description:
        "Check frame condition, clean drivetrain, and document any scratches in maintenance log.",
    },
    {
      id: "task-008",
      title: "Post-ride wash station rotation",
      status_id: "return-from-ride",
      assignee_name: "Ethan Ross",
      due_date: "2026-02-12",
      description:
        "Queue returned bikes for cleaning and mark those requiring quick tune-up.",
    },
    {
      id: "task-009",
      title: "Battery swap complete - eBike #5",
      status_id: "done",
      assignee_name: "Olivia Tran",
      due_date: "2026-02-10",
      description:
        "Battery health validated after swap and charging dock report updated.",
    },
    {
      id: "task-010",
      title: "Lock replacement documented",
      status_id: "done",
      assignee_name: "Sam Green",
      due_date: "2026-02-10",
      description:
        "Old lock archived, serial numbers synced to rental inventory sheet.",
    },
  ],
};

