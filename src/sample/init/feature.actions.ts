import { createAction } from 'redux-actions';
import { UnaryFunction } from 'rxjs';

import { PayloadAction } from '../../store/actions';

export const ADD_SAMPLE_ACTION = 'ADD_SAMPLE_ACTION';

export type AddSampleAction = PayloadAction<string>;

export const addSampleAction: UnaryFunction<
  string,
  AddSampleAction
> = createAction(ADD_SAMPLE_ACTION);
