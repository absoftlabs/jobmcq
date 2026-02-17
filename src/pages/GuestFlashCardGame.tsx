import FlashCardGame from "@/pages/student/FlashCardGame";

// Guest wrapper - uses the same component, which handles guest vs logged-in internally
export default function GuestFlashCardGame() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container py-8">
        <FlashCardGame />
      </div>
    </div>
  );
}
