import { Component, signal } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { ZapEditor, MentionUser } from 'zapeditor';

@Component({
  selector: 'app-root',
  imports: [HttpClientModule, ZapEditor],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'demo';

  // Mock users for mention functionality
  users = signal<MentionUser[]>([
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '3',
      name: 'Mike Johnson',
      email: 'mike@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '4',
      name: 'Sarah Wilson',
      email: 'sarah@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '5',
      name: 'David Brown',
      email: 'david@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '6',
      name: 'Emily Davis',
      email: 'emily@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '7',
      name: 'Chris Miller',
      email: 'chris@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
    {
      id: '8',
      name: 'Lisa Garcia',
      email: 'lisa@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
  ]);

  onMentionSearch(query: string) {
    const currentUsers = this.users();
    const bikasUser = {
      id: '9',
      name: 'Bikas',
      email: 'bikas@example.com',
      avatar: 'https://i.pravatar.cc/150?img=3',
    };

    // Check if Bikas already exists in the users array
    const bikasExists = currentUsers.some(
      (user) => user.id === '9' || user.name === 'Bikas'
    );

    if (!bikasExists) {
      this.users.set([...currentUsers, bikasUser]);
    }
  }
}
