import { TestBed } from '@angular/core/testing';

import { LudoService } from './ludo.service';

describe('LudoService', () => {
  let service: LudoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LudoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
