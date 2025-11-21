import { Controller, Param, Sse } from '@nestjs/common';
import { Observable, interval, switchMap, takeWhile, catchError, from } from 'rxjs';
import { QueueService } from '../queue/queue.service';

@Controller('api/generations')
export class GenerationGateway {
  constructor(private readonly queueService: QueueService) {}

  @Sse('stream/:jobId')
  streamProgress(@Param('jobId') jobId: string): Observable<any> {
    return interval(1000).pipe(
      switchMap(() => 
        from(this.queueService.getJobStatus(jobId)).pipe(
          switchMap(status => {
            if (!status) {
              return [{
                type: 'error', 
                data: 'Job not found'
              }];
            }

            return [{
              type: 'progress',
              data: status, // maybe I should filter some fields from job status
            }];
          }),
          catchError(error => [
            {
              type: 'error',
              data: error.message
            }
          ])
        )
      ),
      takeWhile((data: any) => {
        return data.type !== 'error' && 
               data.data.state !== 'completed' && 
               data.data.state !== 'failed';
      }, true)
    );
  }
}